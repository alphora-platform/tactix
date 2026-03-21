import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CompStatDto } from './dto/comp-stat.dto';
import { CompDetectionService } from './comp-detection.service';
import { TrendDirection } from './dto/trend.dto';
import { TierClassificationService } from './tier-classification.service';
import { FriendlyNameService } from '../metadata/friendly-name.service';
import { AssetUrlService } from '../metadata/asset-url.service';
import { PatchVersion } from '../../database/entities';

interface MvCompStatsRow {
  comp_id: string;
  trait_combo: string[];
  win_rate: string;
  top4_rate: string;
  avg_placement: string;
  sample_size: string;
}

interface PatchRow {
  game_version: string;
}

/** Minimal trend row we need from mv_comp_trend to annotate getTopComps results. */
interface TrendRow {
  comp_id: string;
  time_bucket: string;
  win_rate: string;
}

@Injectable()
export class MetaStatsService {
  private readonly logger = new Logger(MetaStatsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService,
    private readonly tierClassification: TierClassificationService,
    private readonly friendlyNameService: FriendlyNameService,
    private readonly assetUrlService: AssetUrlService,
    @InjectRepository(PatchVersion)
    private readonly patchVersionRepo: Repository<PatchVersion>
  ) {}

  /**
   * Returns the top-N comps from mv_comp_stats sorted by a composite score:
   *   score = (win_rate × 0.4) + (top4_rate × 0.3) + ((1 / avg_placement) × 0.3)
   *
   * Trend direction (RISING / FALLING / STABLE) is attached to each result by
   * doing a single bulk-fetch from mv_comp_trend — no N+1 round-trips.
   *
   * When a region is provided the query joins back to the matches table to
   * restrict the sample to that region only.
   */
  async getTopComps(patch: string, region?: string, limit = 20): Promise<CompStatDto[]> {
    let sql: string;
    let params: unknown[];

    if (region) {
      sql = `
        SELECT
          comp_id,
          trait_combo,
          win_rate,
          top4_rate,
          avg_placement,
          sample_size
        FROM mv_comp_stats_by_region
        WHERE patch = $1
          AND region = $2
        ORDER BY (win_rate * 0.4 + top4_rate * 0.3 + (1.0 / NULLIF(avg_placement, 0)) * 0.3) DESC
        LIMIT $3
      `;
      params = [patch, region, limit];
    } else {
      sql = `
        SELECT
          comp_id,
          trait_combo,
          win_rate,
          top4_rate,
          avg_placement,
          sample_size
        FROM mv_comp_stats
        WHERE patch = $1
        ORDER BY (win_rate * 0.4 + top4_rate * 0.3 + (1.0 / NULLIF(avg_placement, 0)) * 0.3) DESC
        LIMIT $2
      `;
      params = [patch, limit];
    }

    this.logger.debug(`getTopComps patch=${patch} region=${region ?? 'all'} limit=${limit}`);

    const rows = await this.dataSource.query<MvCompStatsRow[]>(sql, params);

    if (rows.length === 0) return [];

    // ── Bulk-fetch trend + tier data in parallel ──────────────────────────
    const compIds = rows.map((r) => r.comp_id);
    const [trendMap, tierMap] = await Promise.all([
      this.fetchTrendMap(compIds, patch),
      this.tierClassification.classifyAll(patch),
    ]);

    return Promise.all(
      rows.map(async (row) => {
        const tier = tierMap.get(row.comp_id);
        const winRate = parseFloat(row.win_rate);
        const top4Rate = parseFloat(row.top4_rate);
        const avgPlacement = parseFloat(row.avg_placement);
        const sampleSize = parseInt(row.sample_size, 10);

        const comp_label = await this.friendlyNameService.resolveCompLabel(row.trait_combo);
        const trait_icons = await Promise.all(
          row.trait_combo.map((t) => this.assetUrlService.getTraitIcon(t))
        );

        return {
          comp_id: row.comp_id,
          label: this.compDetection.getCompLabel(row.trait_combo),
          comp_label,
          trait_icons,
          win_rate: winRate,
          top4_rate: top4Rate,
          avg_placement: avgPlacement,
          sample_size: sampleSize,
          trend_direction: trendMap.get(row.comp_id),
          tier,
        };
      })
    );
  }

  /**
   * Returns the ordered list of recent patches for the API.
   * The first entry is always the current (latest) patch.
   */
  async getRecentPatches(limit = 8): Promise<{ current: string; patches: string[] }> {
    const rows = await this.patchVersionRepo.find({
      order: { lastSeenAt: 'DESC' },
      take: limit,
    });

    const patches = rows.map((r) => r.patch);
    const current = rows.find((r) => r.isCurrent)?.patch ?? patches[0] ?? '';
    return { current, patches };
  }

  /**
   * Synchronises the patch_versions table with actual data in the matches table.
   *
   * Called by EtlService after processing each match so the table stays
   * up-to-date without a separate cron job.
   *
   * Algorithm:
   *  1. Aggregate (patch, min(game_datetime), max(game_datetime), count) from matches.
   *  2. Upsert into patch_versions.
   *  3. Mark the row with the latest last_seen_at as is_current=true, rest false.
   */
  async syncPatchVersions(): Promise<void> {
    interface PatchAgg {
      patch: string;
      first_seen: Date;
      last_seen: Date;
      cnt: string;
    }

    // Exclude PBE matches — PBE runs a newer patch ahead of live, so including
    // it would incorrectly mark the upcoming PBE patch as is_current and break
    // all live analytics queries.
    const rows = await this.dataSource.query<PatchAgg[]>(`
      SELECT
        patch,
        MIN(game_datetime) AS first_seen,
        MAX(game_datetime) AS last_seen,
        COUNT(*)::text     AS cnt
      FROM matches
      WHERE patch IS NOT NULL AND patch != 'unknown'
        AND (region IS NULL OR region != 'PBE')
      GROUP BY patch
    `);

    if (rows.length === 0) return;

    // Single bulk upsert via raw SQL — cleaner than TypeORM QueryBuilder chaining
    for (const row of rows) {
      await this.dataSource.query(
        `
        INSERT INTO patch_versions (patch, is_current, first_seen_at, last_seen_at, match_count)
        VALUES ($1, false, $2, $3, $4)
        ON CONFLICT (patch) DO UPDATE
          SET last_seen_at = EXCLUDED.last_seen_at,
              match_count  = EXCLUDED.match_count
        `,
        [row.patch, row.first_seen, row.last_seen, parseInt(row.cnt, 10)]
      );
    }

    // Promote the patch with the most recent last_seen_at as is_current
    const newestPatch = rows.reduce((a, b) =>
      new Date(a.last_seen) > new Date(b.last_seen) ? a : b
    ).patch;

    await this.dataSource.transaction(async (em) => {
      await em.query(`UPDATE patch_versions SET is_current = false`);
      await em.query(`UPDATE patch_versions SET is_current = true WHERE patch = $1`, [newestPatch]);
    });

    this.logger.debug(`[PatchSync] Synced ${rows.length} patches — current: ${newestPatch}`);
  }

  /**
   * Returns the current patch string for PBE matches.
   * PBE runs ahead of live — this is separate from the live `getCurrentPatch()`.
   */
  async getCurrentPbePatch(): Promise<string> {
    const rows = await this.dataSource.query<{ patch: string }[]>(
      `SELECT patch FROM matches
       WHERE region = 'PBE' AND patch IS NOT NULL AND patch != 'unknown'
       ORDER BY game_datetime DESC LIMIT 1`
    );
    return rows[0]?.patch ?? '';
  }

  // ── getCurrentPatch (kept for backwards-compat with existing controllers) ──

  async getCurrentPatch(): Promise<string> {
    // Only look at live (non-PBE) matches so the PBE ahead-of-patch data
    // doesn't pollute the live current-patch detection.
    const rows = await this.dataSource.query<PatchRow[]>(
      `SELECT DISTINCT game_version FROM matches
       WHERE region IS NULL OR region != 'PBE'
       ORDER BY game_version DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return '';
    }

    // "Version 14.3.610.1234" → ["14", "3"] → "14.3"
    const raw = rows[0].game_version;
    const match = raw.match(/(\d+)\.(\d+)/);
    if (!match) {
      this.logger.warn(`Could not parse patch from game_version: "${raw}"`);
      return raw;
    }

    return `${match[1]}.${match[2]}`;
  }

  /**
   * Returns the Unix epoch seconds of when the current patch first appeared in match data.
   * Returns undefined if no current patch is tracked yet (e.g. on first boot before any ETL).
   */
  async getCurrentPatchStartSeconds(): Promise<number | undefined> {
    const row = await this.patchVersionRepo.findOne({
      where: { isCurrent: true },
      select: ['firstSeenAt'],
    });
    return row?.firstSeenAt ? Math.floor(row.firstSeenAt.getTime() / 1_000) : undefined;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Bulk-fetches 6h and 24h win_rates for each comp_id and computes direction.
   * Returns a Map<comp_id, TrendDirection> for O(1) lookup in the caller.
   *
   * Fetching only the two windows we need (6h, 24h) keeps the result set small
   * regardless of how many time-buckets mv_comp_trend stores.
   */
  private async fetchTrendMap(
    compIds: string[],
    patch: string
  ): Promise<Map<string, TrendDirection>> {
    if (compIds.length === 0) return new Map();

    // Build positional placeholders: $3, $4, … $N
    const placeholders = compIds.map((_, i) => `$${i + 3}`).join(', ');

    const trendRows = await this.dataSource.query<TrendRow[]>(
      `
      SELECT comp_id, time_bucket, win_rate
      FROM   mv_comp_trend
      WHERE  patch       = $1
        AND  time_bucket IN ($2::text, '24h')
        AND  comp_id     IN (${placeholders})
      `,
      [patch, '6h', ...compIds]
    );

    // Group by comp_id
    const byComp = new Map<string, { short?: number; long?: number }>();
    for (const row of trendRows) {
      const entry = byComp.get(row.comp_id) ?? {};
      if (row.time_bucket === '6h') entry.short = parseFloat(row.win_rate);
      else if (row.time_bucket === '24h') entry.long = parseFloat(row.win_rate);
      byComp.set(row.comp_id, entry);
    }

    const result = new Map<string, TrendDirection>();
    for (const [compId, { short, long }] of byComp) {
      if (short === undefined || long === undefined) {
        result.set(compId, 'STABLE');
        continue;
      }
      const delta = short - long;
      if (delta > 0.03) result.set(compId, 'RISING');
      else if (delta < -0.03) result.set(compId, 'FALLING');
      else result.set(compId, 'STABLE');
    }

    return result;
  }
}
