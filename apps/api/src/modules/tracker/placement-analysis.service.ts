import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompDetectionService } from '../analytics/comp-detection.service';
import { ParticipantTrait } from '../../database/entities';
import {
  PlacementDistributionDto,
  PlacementBucketDto,
  GroupStatsDto,
  CompBreakdownDto,
  DayOfWeekBreakdownDto,
  HourOfDayBreakdownDto,
  RecentGameDto,
} from './dto/tracker-response.dto';

// ── Raw query row shapes ───────────────────────────────────────────────────

interface OverallRow {
  games: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface PlacementRow {
  placement: string;
  count: string;
}

interface CompRow {
  comp_id: string;
  games: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface DowRow {
  day_of_week: string;
  games: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface HodRow {
  hour_of_day: string;
  games: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface RecentRow {
  match_id: string;
  game_datetime: Date;
  placement: string;
  game_length: string;
  // trait columns aggregated as array from the JOIN
  trait_names: string[];
  styles: string[];
}

// ── Day-of-week name map (PostgreSQL DOW: 0=Sunday) ──────────────────────
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Injectable()
export class PlacementAnalysisService {
  private readonly logger = new Logger(PlacementAnalysisService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Returns a full placement breakdown for a player.
   *
   * All four sub-groups (overall, by_comp, by_day_of_week, by_hour_of_day)
   * are fetched in parallel to minimise latency. The `by_comp` list is capped
   * at the top-5 comps by games played.
   *
   * @param puuid   Riot PUUID
   * @param patch   Optional short patch string (e.g. "14.3"). When omitted,
   *                all patches are included.
   */
  async getPlacementDistribution(puuid: string, patch?: string): Promise<PlacementDistributionDto> {
    this.logger.debug(`getPlacementDistribution puuid=${puuid} patch=${patch ?? 'all'}`);

    const [overallRows, placementRows, compRows, dowRows, hodRows] = await Promise.all([
      this.queryOverall(puuid, patch),
      this.queryPlacementHistogram(puuid, patch),
      this.queryByComp(puuid, patch),
      this.queryByDayOfWeek(puuid, patch),
      this.queryByHourOfDay(puuid, patch),
    ]);

    const overallGames = overallRows.length > 0 ? parseInt(overallRows[0].games, 10) : 0;

    const distribution: PlacementBucketDto[] = placementRows.map((r) => ({
      placement: parseInt(r.placement, 10),
      count: parseInt(r.count, 10),
      frequency: overallGames > 0 ? parseInt(r.count, 10) / overallGames : 0,
    }));

    const overall: GroupStatsDto =
      overallRows.length > 0
        ? {
            games: overallGames,
            avg_placement: parseFloat(overallRows[0].avg_placement),
            top4_rate: parseFloat(overallRows[0].top4_rate),
            win_rate: parseFloat(overallRows[0].win_rate),
          }
        : { games: 0, avg_placement: 0, top4_rate: 0, win_rate: 0 };

    const by_comp: CompBreakdownDto[] = compRows.map((r) => ({
      comp_id: r.comp_id,
      label: r.comp_id, // label resolved below
      games: parseInt(r.games, 10),
      avg_placement: parseFloat(r.avg_placement),
      top4_rate: parseFloat(r.top4_rate),
      win_rate: parseFloat(r.win_rate),
    }));

    // Enrich comp labels from mv_comp_stats (best-effort; fall back to comp_id).
    await this.enrichCompLabels(by_comp);

    const by_day_of_week: DayOfWeekBreakdownDto[] = dowRows.map((r) => {
      const dow = parseInt(r.day_of_week, 10);
      return {
        day_of_week: dow,
        day_name: DOW_NAMES[dow] ?? 'Unknown',
        games: parseInt(r.games, 10),
        avg_placement: parseFloat(r.avg_placement),
        top4_rate: parseFloat(r.top4_rate),
        win_rate: parseFloat(r.win_rate),
      };
    });

    const by_hour_of_day: HourOfDayBreakdownDto[] = hodRows.map((r) => ({
      hour_of_day: parseInt(r.hour_of_day, 10),
      games: parseInt(r.games, 10),
      avg_placement: parseFloat(r.avg_placement),
      top4_rate: parseFloat(r.top4_rate),
      win_rate: parseFloat(r.win_rate),
    }));

    return { distribution, overall, by_comp, by_day_of_week, by_hour_of_day };
  }

  /**
   * Returns the N most-recent ranked games for a player, each annotated with
   * the detected comp (comp_id + human label).
   *
   * Traits are aggregated per game in one query — no N+1 round trips.
   */
  async getRecentGames(puuid: string, limit = 20): Promise<RecentGameDto[]> {
    this.logger.debug(`getRecentGames puuid=${puuid} limit=${limit}`);

    const rows = await this.dataSource.query<RecentRow[]>(
      `
      SELECT
        p.match_id,
        m.game_datetime,
        p.placement,
        m.game_length,
        array_agg(pt.trait_name ORDER BY pt.trait_name) FILTER (WHERE pt.style > 0) AS trait_names,
        array_agg(pt.style       ORDER BY pt.trait_name) FILTER (WHERE pt.style > 0) AS styles
      FROM participants p
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      LEFT JOIN participant_traits pt
        ON pt.match_id = p.match_id
       AND pt.puuid    = p.puuid
      WHERE p.puuid = $1
      GROUP BY p.match_id, m.game_datetime, p.placement, m.game_length
      ORDER BY m.game_datetime DESC
      LIMIT $2
      `,
      [puuid, limit]
    );

    return rows.map((r) => {
      const traitObjs = this.buildTraitObjects(r.trait_names ?? [], r.styles ?? []);
      const compId = this.compDetection.identifyComp(traitObjs);
      const compLabel = this.compDetection.getCompLabel(r.trait_names ?? []);

      return {
        match_id: r.match_id,
        game_datetime: r.game_datetime,
        placement: parseInt(r.placement as unknown as string, 10),
        comp_id: compId,
        comp_label: compLabel,
        game_length: parseFloat(r.game_length as unknown as string),
      };
    });
  }

  // ── Private query helpers ──────────────────────────────────────────────

  private async queryOverall(puuid: string, patch?: string): Promise<OverallRow[]> {
    return this.dataSource.query<OverallRow[]>(
      `
      SELECT
        COUNT(*)::text                                                              AS games,
        AVG(p.placement)::text                                                     AS avg_placement,
        (COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0))::text AS top4_rate,
        (COUNT(*) FILTER (WHERE p.placement  = 1)::float / NULLIF(COUNT(*), 0))::text AS win_rate
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
      WHERE p.puuid = $1
        AND ($2::text IS NULL OR m.patch = $2)
      `,
      [puuid, patch ?? null]
    );
  }

  private async queryPlacementHistogram(puuid: string, patch?: string): Promise<PlacementRow[]> {
    return this.dataSource.query<PlacementRow[]>(
      `
      SELECT
        p.placement::text,
        COUNT(*)::text AS count
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
      WHERE p.puuid = $1
        AND ($2::text IS NULL OR m.patch = $2)
      GROUP BY p.placement
      ORDER BY p.placement
      `,
      [puuid, patch ?? null]
    );
  }

  private async queryByComp(puuid: string, patch?: string): Promise<CompRow[]> {
    return this.dataSource.query<CompRow[]>(
      `
      WITH per_game AS (
        SELECT
          p.match_id,
          p.placement,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
        FROM participants p
        JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE p.puuid = $1
          AND ($2::text IS NULL OR m.patch = $2)
        GROUP BY p.match_id, p.placement
      )
      SELECT
        comp_id,
        COUNT(*)::text                                                              AS games,
        AVG(placement)::text                                                       AS avg_placement,
        (COUNT(*) FILTER (WHERE placement <= 4)::float / NULLIF(COUNT(*), 0))::text AS top4_rate,
        (COUNT(*) FILTER (WHERE placement  = 1)::float / NULLIF(COUNT(*), 0))::text AS win_rate
      FROM per_game
      GROUP BY comp_id
      ORDER BY COUNT(*) DESC
      LIMIT 5
      `,
      [puuid, patch ?? null]
    );
  }

  private async queryByDayOfWeek(puuid: string, patch?: string): Promise<DowRow[]> {
    return this.dataSource.query<DowRow[]>(
      `
      SELECT
        EXTRACT(DOW FROM m.game_datetime)::text  AS day_of_week,
        COUNT(*)::text                           AS games,
        AVG(p.placement)::text                   AS avg_placement,
        (COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0))::text AS top4_rate,
        (COUNT(*) FILTER (WHERE p.placement  = 1)::float / NULLIF(COUNT(*), 0))::text AS win_rate
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
      WHERE p.puuid = $1
        AND ($2::text IS NULL OR m.patch = $2)
      GROUP BY EXTRACT(DOW FROM m.game_datetime)
      ORDER BY day_of_week
      `,
      [puuid, patch ?? null]
    );
  }

  private async queryByHourOfDay(puuid: string, patch?: string): Promise<HodRow[]> {
    return this.dataSource.query<HodRow[]>(
      `
      SELECT
        EXTRACT(HOUR FROM m.game_datetime)::text AS hour_of_day,
        COUNT(*)::text                           AS games,
        AVG(p.placement)::text                   AS avg_placement,
        (COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0))::text AS top4_rate,
        (COUNT(*) FILTER (WHERE p.placement  = 1)::float / NULLIF(COUNT(*), 0))::text AS win_rate
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
      WHERE p.puuid = $1
        AND ($2::text IS NULL OR m.patch = $2)
      GROUP BY EXTRACT(HOUR FROM m.game_datetime)
      ORDER BY hour_of_day
      `,
      [puuid, patch ?? null]
    );
  }

  /**
   * Reconstructs ParticipantTrait-compatible objects from the parallel arrays
   * returned by pg's `array_agg`. Only `traitName` and `style` are accessed by
   * CompDetectionService.identifyComp — the rest of the fields are zeroed out.
   */
  private buildTraitObjects(names: string[], styles: string[]): ParticipantTrait[] {
    return names.map((name, i) => ({
      traitName: name,
      style: parseInt(styles[i] as string, 10),
      id: '',
      matchId: '',
      puuid: '',
      numUnits: 0,
      tierCurrent: 0,
      tierTotal: 0,
      participant: null as unknown as ParticipantTrait['participant'],
    })) as ParticipantTrait[];
  }

  /**
   * Mutates `items` in place to set the `label` field by looking up the
   * trait_combo from mv_comp_stats. Falls back to comp_id if the view has
   * no row for a given comp (view may not have refreshed yet).
   */
  private async enrichCompLabels(items: CompBreakdownDto[]): Promise<void> {
    if (items.length === 0) return;

    const ids = items.map((c) => c.comp_id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

    interface TraitComboRow {
      comp_id: string;
      trait_combo: string[];
    }

    const rows = await this.dataSource.query<TraitComboRow[]>(
      `SELECT comp_id, trait_combo FROM mv_comp_stats WHERE comp_id IN (${placeholders}) LIMIT ${ids.length}`,
      ids
    );

    const comboMap = new Map(rows.map((r) => [r.comp_id, r.trait_combo]));

    for (const item of items) {
      const combo = comboMap.get(item.comp_id);
      item.label = combo ? this.compDetection.getCompLabel(combo) : item.comp_id;
    }
  }
}
