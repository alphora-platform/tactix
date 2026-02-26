import { Controller, Get, Param, Query, BadRequestException, Logger } from '@nestjs/common';
import { CompQueryDto } from './dto/comp-query.dto';
import { TrendQueryDto } from './dto/trend-query.dto';
import { MetaStatsService } from './meta-stats.service';
import { TrendAnalysisService } from './trend-analysis.service';
import { TierClassificationService } from './tier-classification.service';
import { CompAnalyzerService } from './comp-analyzer.service';
import { RegionComparisonService } from './region-comparison.service';
import type { RegionQueryDto, RegionCompareQueryDto } from './dto/region-comparison.dto';

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly metaStats: MetaStatsService,
    private readonly trendAnalysis: TrendAnalysisService,
    private readonly tierClassification: TierClassificationService,
    private readonly compAnalyzer: CompAnalyzerService,
    private readonly regionComparison: RegionComparisonService
  ) {}

  // ── Meta endpoint ──────────────────────────────────────────────────────────

  /**
   * GET /analytics/meta
   *
   * Query params:
   *   - patch      (optional) — defaults to current patch from DB
   *   - region     (optional) — filter by region, e.g. "na1", "euw1"
   *   - limit      (optional, 1–100, default 20)
   *   - timeWindow (optional) — one of '6h'|'12h'|'24h'|'3d'|'7d' (reserved)
   *
   * Each entry in the response includes `trend_direction` (RISING/FALLING/STABLE)
   * derived from the 6h vs 24h win-rate delta in mv_comp_trend.
   */
  @Get('meta')
  async getMeta(@Query() query: CompQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    this.logger.log(`GET /analytics/meta patch=${patch} region=${query.region ?? 'all'}`);

    return this.metaStats.getTopComps(patch, query.region, query.limit ?? 20);
  }

  // ── Tier-list endpoint ───────────────────────────────────────────────────

  /**
   * GET /analytics/tier-list
   *
   * Returns all comps for a patch grouped into S / A / B / C tiers, ordered
   * by composite_score DESC within each tier. Results are cached in Redis for
   * 30 minutes (configurable via TIER_LIST_CACHE_TTL env var).
   *
   * Query params:
   *   - patch (optional) — defaults to current patch from DB
   */
  @Get('tier-list')
  async getTierList(@Query() query: TrendQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    this.logger.log(`GET /analytics/tier-list patch=${patch}`);

    return this.tierClassification.getTierList(patch);
  }

  // ── Comp deep-dive endpoint ────────────────────────────────────────────────

  /**
   * GET /analytics/comp/:compId
   *
   * Returns the full deep-dive playbook for a single comp:
   *   - best_items:     top-5 item combos per carry unit (from mv_item_combo_stats)
   *   - augment_path:   top-3 augments per offer stage (from mv_comp_augment_stats)
   *   - level_timing:   avg final level, % reaching L8+, and gold-left (top-4 games)
   *   - unit_priority:  all units ranked by priority score with core/flex/optional role
   *
   * Path params:
   *   - compId  — 16-char MD5 hex hash (from /analytics/meta or /analytics/tier-list)
   *
   * Query params:
   *   - patch (optional) — e.g. "14.3". Defaults to current patch from DB.
   */
  @Get('comp/:compId')
  async getCompDeepDive(@Param('compId') compId: string, @Query() query: TrendQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    this.logger.log(`GET /analytics/comp/${compId} patch=${patch}`);

    return this.compAnalyzer.getCompDeepDive(compId, patch);
  }

  // ── Region comparison endpoints ────────────────────────────────────────────

  /**
   * GET /analytics/regions
   *
   * Returns all comps that appear in ≥ 2 of the specified regions, sorted by
   * regional_diff DESC (biggest KR/EUW/NA divergence at the top).
   *
   * Query params:
   *   - patch   (optional) — defaults to current patch
   *   - regions (optional) — comma-separated codes, default "KR,EUW,NA"
   */
  @Get('regions')
  async getRegionalMeta(@Query() query: RegionQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    const regions = query.regions
      ? query.regions
          .split(',')
          .map((r) => r.trim().toUpperCase())
          .filter(Boolean)
      : undefined;

    this.logger.log(
      `GET /analytics/regions patch=${patch} regions=${(regions ?? ['KR', 'EUW', 'NA']).join(',')}`
    );

    return this.regionComparison.getRegionalMeta(patch, regions);
  }

  /**
   * GET /analytics/regions/exclusive
   *
   * Returns comps that are dominant (≥ 50% win rate) in exactly one region
   * but weak (< 45%) in all other queried regions.
   *
   * Query params:
   *   - patch   (optional) — defaults to current patch
   *   - regions (optional) — comma-separated codes, default "KR,EUW,NA"
   */
  @Get('regions/exclusive')
  async getRegionalExclusive(@Query() query: RegionQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    const regions = query.regions
      ? query.regions
          .split(',')
          .map((r) => r.trim().toUpperCase())
          .filter(Boolean)
      : undefined;

    this.logger.log(`GET /analytics/regions/exclusive patch=${patch}`);

    return this.regionComparison.getRegionalExclusive(patch, regions);
  }

  /**
   * GET /analytics/regions/compare
   *
   * Head-to-head comparison between exactly two regions. Returns per-comp
   * win-rate deltas and an overall meta_similarity score (cosine similarity).
   *
   * Query params:
   *   - patch   (optional) — defaults to current patch
   *   - regionA (required) — e.g. "KR"
   *   - regionB (required) — e.g. "EUW"
   */
  @Get('regions/compare')
  async compareRegions(@Query() query: RegionCompareQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    if (!query.regionA || !query.regionB) {
      throw new BadRequestException('Both `regionA` and `regionB` query params are required.');
    }

    if (query.regionA.toUpperCase() === query.regionB.toUpperCase()) {
      throw new BadRequestException('`regionA` and `regionB` must be different regions.');
    }

    this.logger.log(
      `GET /analytics/regions/compare patch=${patch} ${query.regionA} vs ${query.regionB}`
    );

    return this.regionComparison.compareRegions(
      patch,
      query.regionA.toUpperCase(),
      query.regionB.toUpperCase()
    );
  }

  // ── Trend endpoints ────────────────────────────────────────────────────────

  /**
   * GET /analytics/trend/snapshot
   *
   * Returns all comps + their trend direction for a given patch and time window.
   * Sorted by win_rate DESC within the chosen window.
   *
   * Query params:
   *   - patch      (optional) — defaults to current patch
   *   - timeWindow (optional, default '24h') — one of '6h'|'12h'|'24h'|'3d'|'7d'
   */
  @Get('trend/snapshot')
  async getTrendSnapshot(@Query() query: TrendQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    const timeWindow = query.timeWindow ?? '24h';

    this.logger.log(`GET /analytics/trend/snapshot patch=${patch} timeWindow=${timeWindow}`);

    return this.trendAnalysis.getMetaSnapshot(patch, timeWindow);
  }

  /**
   * GET /analytics/trend/:compId
   *
   * Returns the full per-window breakdown and trend direction (RISING/FALLING/STABLE)
   * for a single comp across all time windows (6h, 12h, 24h, 3d, 7d).
   *
   * Path params:
   *   - compId  — 16-char MD5 hex hash identifying the comp
   *
   * Query params:
   *   - patch   (optional) — defaults to current patch from DB
   */
  @Get('trend/:compId')
  async getCompTrend(@Param('compId') compId: string, @Query() query: TrendQueryDto) {
    const patch = query.patch ?? (await this.metaStats.getCurrentPatch());

    if (!patch) {
      throw new BadRequestException(
        'No patch found in database. Pass `patch` explicitly or wait for data collection.'
      );
    }

    this.logger.log(`GET /analytics/trend/${compId} patch=${patch}`);

    return this.trendAnalysis.getTrend(compId, patch);
  }
}
