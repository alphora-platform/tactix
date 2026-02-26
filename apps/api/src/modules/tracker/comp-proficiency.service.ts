import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompDetectionService } from '../analytics/comp-detection.service';
import { CompProficiencyDto } from './dto/tracker-response.dto';

// ── Raw query row shapes ───────────────────────────────────────────────────

/** Row from the player-level aggregation per comp. */
interface PlayerCompRow {
  comp_id: string;
  games: string;
  player_avg_placement: string;
  win_rate: string;
  top4_rate: string;
}

/** Row from mv_comp_stats for the same comp_ids. */
interface MetaCompRow {
  comp_id: string;
  avg_placement: string; // meta average
  trait_combo: string[];
}

/** Minimum games a player must have played on a comp to appear in results. */
const MIN_GAMES = 5;

@Injectable()
export class CompProficiencyService {
  private readonly logger = new Logger(CompProficiencyService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Returns proficiency scores for every comp the player has run at least
   * `MIN_GAMES` times in the given patch (or all patches when omitted).
   *
   * Proficiency derivation:
   *   proficiency_score = (meta_avg_placement - player_avg_placement)
   *                       / meta_avg_placement × 100
   *
   * A positive score means the player places better (lower number) than the
   * average for that comp. A negative score means they underperform.
   *
   * Results are ordered by games_played DESC so the player's most-played
   * comps appear first — the most relevant insight.
   */
  async getCompProficiency(puuid: string, patch?: string): Promise<CompProficiencyDto[]> {
    this.logger.debug(`getCompProficiency puuid=${puuid} patch=${patch ?? 'all'}`);

    // Step 1: Aggregate per-comp stats for this player (CTE approach to get
    //         comp_id through the same md5(string_agg) fingerprint).
    const playerRows = await this.dataSource.query<PlayerCompRow[]>(
      `
      WITH per_game AS (
        SELECT
          p.match_id,
          p.placement,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
        FROM participants p
        JOIN matches m
          ON m.match_id = p.match_id
         AND m.queue_id = 1100
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
        AVG(placement)::text                                                       AS player_avg_placement,
        (COUNT(*) FILTER (WHERE placement = 1)::float / NULLIF(COUNT(*), 0))::text AS win_rate,
        (COUNT(*) FILTER (WHERE placement <= 4)::float / NULLIF(COUNT(*), 0))::text AS top4_rate
      FROM per_game
      GROUP BY comp_id
      HAVING COUNT(*) >= $3
      ORDER BY COUNT(*) DESC
      `,
      [puuid, patch ?? null, MIN_GAMES]
    );

    if (playerRows.length === 0) return [];

    // Step 2: Single batch lookup in mv_comp_stats for meta avg + trait labels.
    const compIds = playerRows.map((r) => r.comp_id);
    const placeholders = compIds.map((_, i) => `$${i + 1}`).join(', ');

    const metaRows = await this.dataSource.query<MetaCompRow[]>(
      `
      SELECT comp_id, avg_placement, trait_combo
      FROM   mv_comp_stats
      WHERE  comp_id IN (${placeholders})
        AND  ($${compIds.length + 1}::text IS NULL OR patch = $${compIds.length + 1})
      `,
      [...compIds, patch ?? null]
    );

    const metaMap = new Map(metaRows.map((r) => [r.comp_id, r]));

    // Step 3: Combine player stats + meta stats → proficiency score.
    const results: CompProficiencyDto[] = [];

    for (const row of playerRows) {
      const meta = metaMap.get(row.comp_id);
      const playerAvg = parseFloat(row.player_avg_placement);
      const metaAvg = meta ? parseFloat(meta.avg_placement) : null;

      const traitCombo: string[] = meta?.trait_combo ?? [];
      const label = this.compDetection.getCompLabel(traitCombo);

      results.push({
        comp_id: row.comp_id,
        label: label || row.comp_id,
        games_played: parseInt(row.games, 10),
        player_avg_placement: playerAvg,
        meta_avg_placement: metaAvg ?? playerAvg, // fallback: treat as neutral
        proficiency_score:
          metaAvg != null && metaAvg !== 0 ? ((metaAvg - playerAvg) / metaAvg) * 100 : 0,
        win_rate: parseFloat(row.win_rate),
        top4_rate: parseFloat(row.top4_rate),
      });
    }

    return results;
  }
}
