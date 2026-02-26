import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompDetectionService } from './comp-detection.service';
import type {
  RegionalMetaDto,
  RegionalCompDto,
  RegionalExclusiveDto,
  ComparisonDto,
  CompHeadToHeadDto,
} from './dto/region-comparison.dto';

// ── DB row shapes ──────────────────────────────────────────────────────────

interface RegionRow {
  comp_id: string;
  trait_combo: string[];
  region: string;
  sample_size: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface GlobalRow {
  comp_id: string;
  global_win_rate: string;
}

// ── Thresholds ─────────────────────────────────────────────────────────────

/**
 * Win-rate floor for a comp to be considered "strong" in a region.
 * A comp is region-exclusive when it exceeds this in exactly one region.
 */
const EXCLUSIVE_STRONG_THRESHOLD = 0.5;

/**
 * Win-rate ceiling for a comp's performance in "other" regions when declaring it
 * region-exclusive. Below this = it's truly a regional outlier.
 */
const EXCLUSIVE_WEAK_THRESHOLD = 0.45;

/** Default regions to include when caller doesn't specify. */
const DEFAULT_REGIONS = ['KR', 'EUW', 'NA'];

@Injectable()
export class RegionComparisonService {
  private readonly logger = new Logger(RegionComparisonService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns comps that appear in ≥ 2 of the requested regions, sorted by
   * regional divergence (max_win_rate − min_win_rate) descending.
   *
   * Each comp carries per-region stats (win_rate, top4_rate, rank) plus the
   * global win_rate from the main mv_comp_stats view for context.
   */
  async getRegionalMeta(patch: string, regions = DEFAULT_REGIONS): Promise<RegionalMetaDto> {
    this.logger.debug(`getRegionalMeta patch=${patch} regions=${regions.join(',')}`);

    const regionPlaceholders = regions.map((_, i) => `$${i + 2}`).join(', ');

    // ── Step 1: Pull all rows from mv_comp_stats_by_region for the regions ───
    const rows = await this.dataSource.query<RegionRow[]>(
      `
      SELECT
        comp_id,
        trait_combo,
        region,
        sample_size::text,
        avg_placement::text,
        top4_rate::text,
        win_rate::text
      FROM mv_comp_stats_by_region
      WHERE patch  = $1
        AND region IN (${regionPlaceholders})
      ORDER BY comp_id, win_rate DESC
      `,
      [patch, ...regions]
    );

    if (rows.length === 0) return { patch, regions, comps: [] };

    // ── Step 2: Group by comp_id ─────────────────────────────────────────────
    const byComp = new Map<string, { rows: RegionRow[]; traitCombo: string[] }>();
    for (const row of rows) {
      if (!byComp.has(row.comp_id)) {
        byComp.set(row.comp_id, { rows: [], traitCombo: row.trait_combo });
      }
      byComp.get(row.comp_id)!.rows.push(row);
    }

    // ── Step 3: Fetch global win_rate from mv_comp_stats ────────────────────
    const compIds = [...byComp.keys()];
    const globalPlaceholders = compIds.map((_, i) => `$${i + 2}`).join(', ');

    const globalRows = await this.dataSource.query<GlobalRow[]>(
      `
      SELECT comp_id, win_rate::text AS global_win_rate
      FROM mv_comp_stats
      WHERE patch = $1
        AND comp_id IN (${globalPlaceholders})
      `,
      [patch, ...compIds]
    );

    const globalMap = new Map(globalRows.map((r) => [r.comp_id, parseFloat(r.global_win_rate)]));

    // ── Step 4: Compute per-region ranks (within each region, by win_rate) ───
    const regionRankMaps = new Map<string, Map<string, number>>();
    for (const region of regions) {
      const regionRows = rows
        .filter((r) => r.region === region)
        .sort((a, b) => parseFloat(b.win_rate) - parseFloat(a.win_rate));
      const rankMap = new Map<string, number>();
      regionRows.forEach((r, idx) => rankMap.set(r.comp_id, idx + 1));
      regionRankMaps.set(region, rankMap);
    }

    // ── Step 5: Build result, filter to comps in ≥ 2 regions ────────────────
    const comps: RegionalCompDto[] = [];

    for (const [compId, { rows: compRows, traitCombo }] of byComp) {
      if (compRows.length < 2) continue; // appears in only 1 region — skip

      const byRegion: RegionalCompDto['by_region'] = {};
      const winRates: number[] = [];

      for (const r of compRows) {
        const winRate = parseFloat(r.win_rate);
        winRates.push(winRate);
        byRegion[r.region] = {
          win_rate: Math.round(winRate * 10_000) / 100,
          top4_rate: Math.round(parseFloat(r.top4_rate) * 10_000) / 100,
          avg_placement: Math.round(parseFloat(r.avg_placement) * 100) / 100,
          sample_size: parseInt(r.sample_size, 10),
          rank: regionRankMaps.get(r.region)?.get(compId) ?? 0,
        };
      }

      const regionalDiff = Math.max(...winRates) - Math.min(...winRates);

      comps.push({
        comp_id: compId,
        label: this.compDetection.getCompLabel(traitCombo),
        global_win_rate: Math.round((globalMap.get(compId) ?? 0) * 10_000) / 100,
        by_region: byRegion,
        regional_diff: Math.round(regionalDiff * 10_000) / 100,
      });
    }

    // Sort by biggest regional split first
    comps.sort((a, b) => b.regional_diff - a.regional_diff);

    return { patch, regions, comps };
  }

  /**
   * Finds comps that are dominant in exactly one region (win_rate ≥ 50%) but
   * weak (< 45%) in all other queried regions. These are high-value "region
   * exclusive" picks — e.g. a Korean-solved comp that hasn't reached EUW/NA.
   *
   * Defaults to the three major regions if none are specified.
   */
  async getRegionalExclusive(
    patch: string,
    regions = DEFAULT_REGIONS
  ): Promise<RegionalExclusiveDto[]> {
    this.logger.debug(`getRegionalExclusive patch=${patch}`);

    const regionPlaceholders = regions.map((_, i) => `$${i + 2}`).join(', ');

    const rows = await this.dataSource.query<RegionRow[]>(
      `
      SELECT
        comp_id,
        trait_combo,
        region,
        sample_size::text,
        win_rate::text,
        top4_rate::text,
        avg_placement::text
      FROM mv_comp_stats_by_region
      WHERE patch  = $1
        AND region IN (${regionPlaceholders})
      `,
      [patch, ...regions]
    );

    // Group by comp_id
    const byComp = new Map<string, RegionRow[]>();
    for (const row of rows) {
      if (!byComp.has(row.comp_id)) byComp.set(row.comp_id, []);
      byComp.get(row.comp_id)!.push(row);
    }

    const exclusives: RegionalExclusiveDto[] = [];

    for (const [compId, compRows] of byComp) {
      const strongRows = compRows.filter(
        (r) => parseFloat(r.win_rate) >= EXCLUSIVE_STRONG_THRESHOLD
      );
      const weakRows = compRows.filter((r) => parseFloat(r.win_rate) < EXCLUSIVE_WEAK_THRESHOLD);

      // Must be strong in exactly one region, weak in all others where we have data.
      if (strongRows.length !== 1) continue;
      if (weakRows.length < compRows.length - 1) continue;

      const strong = strongRows[0]!;
      const otherWinRates = weakRows.map((r) => parseFloat(r.win_rate));
      const othersAvg =
        otherWinRates.length > 0
          ? otherWinRates.reduce((a, b) => a + b, 0) / otherWinRates.length
          : 0;

      exclusives.push({
        comp_id: compId,
        label: this.compDetection.getCompLabel(strong.trait_combo),
        strong_region: strong.region,
        strong_win_rate: Math.round(parseFloat(strong.win_rate) * 10_000) / 100,
        other_regions_avg: Math.round(othersAvg * 10_000) / 100,
        sample_size: parseInt(strong.sample_size, 10),
      });
    }

    // Sort by biggest gap (strong_win_rate − other_regions_avg) first
    return exclusives.sort(
      (a, b) => b.strong_win_rate - b.other_regions_avg - (a.strong_win_rate - a.other_regions_avg)
    );
  }

  /**
   * Head-to-head comparison between exactly two regions.
   *
   * For every comp that appears in BOTH regions:
   *   - regionA_win_rate, regionB_win_rate, delta = A − B
   *   - winner = whichever region is better (or 'TIED' if |delta| < 1%)
   *
   * Meta similarity is the cosine similarity of the win-rate rank vectors across the
   * shared comp set. 1.0 = identical meta order, 0 = completely different.
   */
  async compareRegions(patch: string, regionA: string, regionB: string): Promise<ComparisonDto> {
    this.logger.debug(`compareRegions patch=${patch} ${regionA} vs ${regionB}`);

    const rows = await this.dataSource.query<RegionRow[]>(
      `
      SELECT
        comp_id,
        trait_combo,
        region,
        win_rate::text,
        top4_rate::text,
        avg_placement::text,
        sample_size::text
      FROM mv_comp_stats_by_region
      WHERE patch  = $1
        AND region IN ($2, $3)
      ORDER BY comp_id
      `,
      [patch, regionA, regionB]
    );

    // Build maps: compId → { A: ..., B: ... }
    const mapA = new Map<string, RegionRow>();
    const mapB = new Map<string, RegionRow>();
    const labelMap = new Map<string, string>();

    for (const row of rows) {
      labelMap.set(row.comp_id, this.compDetection.getCompLabel(row.trait_combo));
      if (row.region === regionA) mapA.set(row.comp_id, row);
      else if (row.region === regionB) mapB.set(row.comp_id, row);
    }

    // Keep only comps present in BOTH regions
    const sharedIds = [...mapA.keys()].filter((id) => mapB.has(id));

    const comps: CompHeadToHeadDto[] = sharedIds.map((compId) => {
      const a = mapA.get(compId)!;
      const b = mapB.get(compId)!;
      const aRate = parseFloat(a.win_rate);
      const bRate = parseFloat(b.win_rate);
      const delta = aRate - bRate;

      let winner: string;
      if (Math.abs(delta) < 0.01) winner = 'TIED';
      else winner = delta > 0 ? regionA : regionB;

      return {
        comp_id: compId,
        label: labelMap.get(compId) ?? compId,
        region_a_win_rate: Math.round(aRate * 10_000) / 100,
        region_b_win_rate: Math.round(bRate * 10_000) / 100,
        delta: Math.round(delta * 10_000) / 100,
        winner,
      };
    });

    // Sort by |delta| descending — biggest divergence at the top
    comps.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // ── Cosine similarity of win-rate rank vectors ─────────────────────────
    const similarity = this.computeCosineSimilarity(
      sharedIds.map((id) => parseFloat(mapA.get(id)!.win_rate)),
      sharedIds.map((id) => parseFloat(mapB.get(id)!.win_rate))
    );

    return {
      region_a: regionA,
      region_b: regionB,
      patch,
      meta_similarity: Math.round(similarity * 10_000) / 10_000,
      comps,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Computes cosine similarity between two numeric vectors.
   * Returns 0 if either vector has zero magnitude.
   *
   * cos(θ) = (A · B) / (|A| × |B|)
   */
  private computeCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! ** 2;
      magB += b[i]! ** 2;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}
