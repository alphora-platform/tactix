import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompStatDto } from './dto/comp-stat.dto';
import { CompDetectionService } from './comp-detection.service';
import { TrendDirection } from './dto/trend.dto';
import { TierClassificationService } from './tier-classification.service';

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
    private readonly tierClassification: TierClassificationService
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
          cs.comp_id,
          cs.trait_combo,
          cs.win_rate,
          cs.top4_rate,
          cs.avg_placement,
          cs.sample_size
        FROM mv_comp_stats cs
        JOIN (
          SELECT DISTINCT
            md5(array_to_string(
              array_agg(pt.trait_name ORDER BY pt.trait_name) FILTER (WHERE pt.style > 0),
              ','
            ))::varchar(16) AS comp_id
          FROM participants p
          JOIN matches m ON m.match_id = p.match_id
          JOIN participant_traits pt ON pt.match_id = p.match_id AND pt.puuid = p.puuid
          WHERE m.game_version = $1
            AND m.region = $2
            AND pt.style > 0
          GROUP BY p.match_id, p.puuid
        ) regional ON regional.comp_id = cs.comp_id
        WHERE cs.patch = $1
        ORDER BY (cs.win_rate * 0.4 + cs.top4_rate * 0.3 + (1.0 / NULLIF(cs.avg_placement, 0)) * 0.3) DESC
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

    return rows.map((row) => {
      const tier = tierMap.get(row.comp_id);
      const winRate = parseFloat(row.win_rate);
      const top4Rate = parseFloat(row.top4_rate);
      const avgPlacement = parseFloat(row.avg_placement);
      const sampleSize = parseInt(row.sample_size, 10);

      return {
        comp_id: row.comp_id,
        label: this.compDetection.getCompLabel(row.trait_combo),
        win_rate: winRate,
        top4_rate: top4Rate,
        avg_placement: avgPlacement,
        sample_size: sampleSize,
        trend_direction: trendMap.get(row.comp_id),
        tier,
      };
    });
  }

  /**
   * Reads the most recent game_version from the matches table and extracts the
   * short patch string, e.g. "Version 14.3.610.1234" → "14.3".
   */
  async getCurrentPatch(): Promise<string> {
    const rows = await this.dataSource.query<PatchRow[]>(
      `SELECT DISTINCT game_version FROM matches ORDER BY game_version DESC LIMIT 1`
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
