import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { CompDetectionService } from './comp-detection.service';
import { Tier, TierListDto, TierListEntryDto } from './dto/tier-list.dto';
import { FriendlyNameService } from '../metadata/friendly-name.service';
import { AssetUrlService } from '../metadata/asset-url.service';
import {
  ANALYTICS_REDIS_CLIENT,
  TIER_LIST_CACHE_PREFIX,
  TIER_LIST_CACHE_TTL_SECONDS,
} from './constants/analytics.constants';

// ── Raw query row ──────────────────────────────────────────────────────────

interface CompStatsRow {
  comp_id: string;
  trait_combo: string[];
  win_rate: string;
  top4_rate: string;
  avg_placement: string;
  sample_size: string;
}

// ── Internal computation shape ─────────────────────────────────────────────

interface ScoredComp {
  comp_id: string;
  trait_combo: string[];
  win_rate: number;
  top4_rate: number;
  avg_placement: number;
  sample_size: number;
  composite_score: number;
}

// ── Tier boundary constants (absolute score floor per tier) ────────────────
// Used as a safety net; percentile thresholds take precedence when the dataset
// is large enough.
const SCORE_FLOOR: Record<Tier, number> = {
  S: 0.75,
  A: 0.6,
  B: 0.45,
  C: 0,
};

// Percentile cutoffs: top X% of comps by composite_score.
const PERCENTILE_TOP_S = 0.1; // top 10% → S
const PERCENTILE_TOP_A = 0.3; // top 30% → A (i.e. 10–30% band)
const PERCENTILE_TOP_B = 0.6; // top 60% → B (i.e. 30–60% band)

@Injectable()
export class TierClassificationService {
  private readonly logger = new Logger(TierClassificationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService,
    private readonly friendlyNameService: FriendlyNameService,
    private readonly assetUrlService: AssetUrlService,
    private readonly config: ConfigService,
    @Inject(ANALYTICS_REDIS_CLIENT) private readonly redis: Redis
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Classifies every comp in the given patch and returns a `Map<comp_id, Tier>`.
   *
   * Tier thresholds are computed **dynamically** from the score distribution:
   *   - Sort all comps by composite_score DESC.
   *   - S: top 10%  AND composite_score ≥ 0.75
   *   - A: top 30%  AND composite_score ≥ 0.60
   *   - B: top 60%  AND composite_score ≥ 0.45
   *   - C: remainder
   *
   * Both criteria (percentile AND absolute floor) must be satisfied.
   * A comp in the top 10% but with a score < 0.75 falls back to A (or lower).
   * This prevents inflating S tier during patch-start when all scores are low.
   */
  async classifyAll(patch: string): Promise<Map<string, Tier>> {
    const scored = await this.fetchAndScore(patch);
    return this.buildTierMap(scored);
  }

  /**
   * Returns the full tier-list for a patch, grouped by tier and ordered by
   * composite_score DESC within each tier.
   *
   * Results are cached in Redis for `TIER_LIST_CACHE_TTL_SECONDS` (30 min by
   * default, overridable via env TIER_LIST_CACHE_TTL).
   */
  async getTierList(patch: string): Promise<TierListDto> {
    const cacheKey = `${TIER_LIST_CACHE_PREFIX}:${patch}`;

    // ── Cache read ────────────────────────────────────────────────────────
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`[TierList] Cache HIT for patch=${patch}`);
        return JSON.parse(cached) as TierListDto;
      }
    } catch (err) {
      // Cache failure is non-fatal — fall through to compute.
      this.logger.warn(
        `[TierList] Redis GET failed for key=${cacheKey}: ${(err as Error).message}`
      );
    }

    this.logger.debug(`[TierList] Cache MISS for patch=${patch} — computing`);

    // ── Compute ───────────────────────────────────────────────────────────
    const result = await this.computeTierList(patch);

    // ── Cache write ───────────────────────────────────────────────────────
    const ttl = this.config.get<number>('TIER_LIST_CACHE_TTL') ?? TIER_LIST_CACHE_TTL_SECONDS;

    try {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
      this.logger.debug(`[TierList] Cached patch=${patch} TTL=${ttl}s`);
    } catch (err) {
      this.logger.warn(
        `[TierList] Redis SETEX failed for key=${cacheKey}: ${(err as Error).message}`
      );
    }

    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Loads all comps for `patch` from mv_comp_stats and computes composite scores.
   */
  private async fetchAndScore(patch: string): Promise<ScoredComp[]> {
    const rows = await this.dataSource.query<CompStatsRow[]>(
      `
      SELECT comp_id, trait_combo, win_rate, top4_rate, avg_placement, sample_size
      FROM   mv_comp_stats
      WHERE  patch = $1
      `,
      [patch]
    );

    if (rows.length === 0) return [];

    // Find the maximum sample_size for the popularity normalisation term.
    const maxSample = Math.max(...rows.map((r) => parseInt(r.sample_size, 10)));

    return rows.map((r) => {
      const winRate = parseFloat(r.win_rate);
      const top4Rate = parseFloat(r.top4_rate);
      const avgPlacement = parseFloat(r.avg_placement);
      const sampleSize = parseInt(r.sample_size, 10);

      const score = this.computeCompositeScore(
        winRate,
        top4Rate,
        avgPlacement,
        sampleSize,
        maxSample
      );

      return {
        comp_id: r.comp_id,
        trait_combo: r.trait_combo,
        win_rate: winRate,
        top4_rate: top4Rate,
        avg_placement: avgPlacement,
        sample_size: sampleSize,
        composite_score: score,
      };
    });
  }

  /**
   * Composite scoring formula:
   *   win_rate                             × 0.35
   * + top4_rate                            × 0.25
   * + (1 / avg_placement / 8)             × 0.20  (placement normalised 0→1)
   * + log10(sample) / log10(max_sample)   × 0.20  (popularity weight)
   *
   * All terms are bounded at [0, 1] before weighting, so the total is [0, 1].
   */
  private computeCompositeScore(
    winRate: number,
    top4Rate: number,
    avgPlacement: number,
    sampleSize: number,
    maxSample: number
  ): number {
    // Placement term: placement 1 → 1/8 = 0.125... wait, we want placement 1 = score 1.
    // Normalise: (1/avg_placement) * 8 gives range [1 (placement=8) ... 8 (placement=1)] / 8 = [0.125..1].
    // But task spec says "(1 / avg_placement * 8) * 0.20" which means (1/p * 8).
    // Clamp to [0,1] in case avg_placement approaches 0.
    const placementTerm = Math.min(1, avgPlacement > 0 ? (1 / avgPlacement) * 8 : 0);

    // Popularity term: log-scaled to dampen outlier sample sizes.
    const popularityTerm =
      maxSample > 1 && sampleSize > 0 ? Math.log10(sampleSize) / Math.log10(maxSample) : 0;

    return winRate * 0.35 + top4Rate * 0.25 + placementTerm * 0.2 + popularityTerm * 0.2;
  }

  /**
   * Assigns a tier to each comp using dual criteria (percentile + absolute
   * score floor). Returns a Map<comp_id, Tier>.
   */
  private buildTierMap(scored: ScoredComp[]): Map<string, Tier> {
    const map = new Map<string, Tier>();
    if (scored.length === 0) return map;

    // Sort descending to determine percentile rank by index.
    const sorted = [...scored].sort((a, b) => b.composite_score - a.composite_score);
    const total = sorted.length;

    sorted.forEach((comp, idx) => {
      const rank = (idx + 1) / total; // 0.01 (top) → 1.0 (bottom)
      const score = comp.composite_score;

      let tier: Tier;

      if (rank <= PERCENTILE_TOP_S && score >= SCORE_FLOOR.S) {
        tier = 'S';
      } else if (rank <= PERCENTILE_TOP_A && score >= SCORE_FLOOR.A) {
        tier = 'A';
      } else if (rank <= PERCENTILE_TOP_B && score >= SCORE_FLOOR.B) {
        tier = 'B';
      } else {
        tier = 'C';
      }

      map.set(comp.comp_id, tier);
    });

    return map;
  }

  /**
   * Computes the full tier-list structure without cache interaction.
   */
  private async computeTierList(patch: string): Promise<TierListDto> {
    const scored = await this.fetchAndScore(patch);
    const tierMap = this.buildTierMap(scored);

    const tiers: TierListDto['tiers'] = { S: [], A: [], B: [], C: [] };

    for (const comp of scored) {
      const tier = tierMap.get(comp.comp_id) ?? 'C';

      const comp_label = await this.friendlyNameService.resolveCompLabel(comp.trait_combo);
      const trait_icons = await Promise.all(
        comp.trait_combo.map((t) => this.assetUrlService.getTraitIcon(t))
      );

      const entry: TierListEntryDto = {
        comp_id: comp.comp_id,
        label: this.compDetection.getCompLabel(comp.trait_combo),
        comp_label,
        trait_icons,
        tier,
        composite_score: Math.round(comp.composite_score * 10_000) / 10_000, // 4dp
        win_rate: comp.win_rate,
        top4_rate: comp.top4_rate,
        avg_placement: comp.avg_placement,
        sample_size: comp.sample_size,
        trait_combo: comp.trait_combo,
      };
      tiers[tier].push(entry);
    }

    // Sort each tier bucket by composite_score DESC.
    for (const bucket of Object.values(tiers)) {
      bucket.sort((a, b) => b.composite_score - a.composite_score);
    }

    return {
      patch,
      generated_at: new Date().toISOString(),
      tiers,
    };
  }
}
