import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { CompAnalyzerService } from './comp-analyzer.service';
import { TierClassificationService } from './tier-classification.service';
import { FriendlyNameService } from '../metadata/friendly-name.service';
import { ANALYTICS_REDIS_CLIENT } from './constants/analytics.constants';
import type { Tier } from './dto/tier-list.dto';
import type {
  PlaybookDto,
  PlaybookCompDto,
  PlaybookCarryDto,
  PlaybookAugmentPathDto,
  PlaybookLevelTimingDto,
  PlaybookFlexRouteDto,
} from './dto/playbook.dto';

/** Redis cache key prefix. */
const PLAYBOOK_CACHE_PREFIX = 'playbook';

/** Cache TTL: 1 hour. */
const PLAYBOOK_CACHE_TTL_SECONDS = 60 * 60;

/** Minimum winrate threshold for playbook inclusion. */
const MIN_WIN_RATE = 0.5;

/** Minimum sample size for statistical significance. */
const MIN_SAMPLE_SIZE = 50;

/** Number of comps to return in the playbook. */
const PLAYBOOK_SIZE = 7;

/** Number of flex routes to return per comp. */
const MAX_FLEX_ROUTES = 3;

/** Level timing data: typical round to reach each level + gold needed. */
const LEVEL_TIMING_DEFAULTS: PlaybookLevelTimingDto[] = [
  { level: 6, typical_round: '3-2', gold_needed: 24 },
  { level: 7, typical_round: '4-1', gold_needed: 40 },
  { level: 8, typical_round: '5-1', gold_needed: 64 },
  { level: 9, typical_round: '6-1', gold_needed: 80 },
];

interface CompStatsRow {
  comp_id: string;
  trait_combo: string[];
  win_rate: string;
  top4_rate: string;
  avg_placement: string;
  sample_size: string;
}

@Injectable()
export class PlaybookService {
  private readonly logger = new Logger(PlaybookService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compAnalyzer: CompAnalyzerService,
    private readonly tierClassification: TierClassificationService,
    private readonly friendlyNameService: FriendlyNameService,
    @Inject(ANALYTICS_REDIS_CLIENT) private readonly redis: Redis
  ) {}

  async getPlaybook(patch: string, region?: string): Promise<PlaybookDto> {
    const cacheKey = `${PLAYBOOK_CACHE_PREFIX}:${patch}:${region ?? 'all'}`;

    // Cache read
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`[Playbook] Cache HIT patch=${patch} region=${region ?? 'all'}`);
        return JSON.parse(cached) as PlaybookDto;
      }
    } catch (err) {
      this.logger.warn(`[Playbook] Redis GET failed: ${(err as Error).message}`);
    }

    this.logger.log(`[Playbook] Computing playbook patch=${patch} region=${region ?? 'all'}`);

    const result = await this.computePlaybook(patch, region);

    // Cache write
    try {
      await this.redis.setex(cacheKey, PLAYBOOK_CACHE_TTL_SECONDS, JSON.stringify(result));
    } catch (err) {
      this.logger.warn(`[Playbook] Redis SETEX failed: ${(err as Error).message}`);
    }

    return result;
  }

  private async computePlaybook(patch: string, region?: string): Promise<PlaybookDto> {
    const allComps = await this.fetchQualifiedComps(patch, region);

    if (allComps.length === 0) {
      return {
        patch,
        updated_at: new Date().toISOString(),
        comps: [],
      };
    }

    // Get tier classification
    const tierMap = await this.tierClassification.classifyAll(patch);

    // Score and rank
    const maxSample = Math.max(...allComps.map((c) => parseInt(c.sample_size, 10)));
    const scored = allComps
      .map((comp) => {
        const winRate = parseFloat(comp.win_rate);
        const top4Rate = parseFloat(comp.top4_rate);
        const avgPlacement = parseFloat(comp.avg_placement);
        const sampleSize = parseInt(comp.sample_size, 10);

        const consistency = top4Rate;
        const sampleWeight =
          maxSample > 1 && sampleSize > 0 ? Math.log10(sampleSize) / Math.log10(maxSample) : 0;

        const compositeScore = winRate * 0.4 + consistency * 0.35 + sampleWeight * 0.25;

        return {
          ...comp,
          win_rate_num: winRate,
          top4_rate_num: top4Rate,
          avg_placement_num: avgPlacement,
          sample_size_num: sampleSize,
          composite_score: compositeScore,
          tier: (tierMap.get(comp.comp_id) ?? 'C') as Tier,
        };
      })
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, PLAYBOOK_SIZE);

    // Enrich each comp with deep-dive data in parallel
    const enrichedComps = await Promise.all(
      scored.map((comp, index) => this.enrichComp(comp, index + 1, patch, allComps))
    );

    return {
      patch,
      updated_at: new Date().toISOString(),
      comps: enrichedComps,
    };
  }

  private async fetchQualifiedComps(patch: string, region?: string): Promise<CompStatsRow[]> {
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
          AND win_rate >= $3
          AND sample_size >= $4
        ORDER BY win_rate DESC
      `;
      params = [patch, region, MIN_WIN_RATE, MIN_SAMPLE_SIZE];
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
          AND win_rate >= $2
          AND sample_size >= $3
        ORDER BY win_rate DESC
      `;
      params = [patch, MIN_WIN_RATE, MIN_SAMPLE_SIZE];
    }

    return this.dataSource.query<CompStatsRow[]>(sql, params);
  }

  private async enrichComp(
    comp: {
      comp_id: string;
      trait_combo: string[];
      win_rate_num: number;
      top4_rate_num: number;
      avg_placement_num: number;
      sample_size_num: number;
      composite_score: number;
      tier: Tier;
    },
    rank: number,
    patch: string,
    allComps: CompStatsRow[]
  ): Promise<PlaybookCompDto> {
    const [bestItems, augmentPath, levelTiming, compLabel, flexRoutes] = await Promise.all([
      this.compAnalyzer.getBestItems(comp.comp_id, patch),
      this.compAnalyzer.getOptimalAugments(comp.comp_id, patch),
      this.compAnalyzer.getLevelTiming(comp.comp_id, patch),
      this.friendlyNameService.resolveCompLabel(comp.trait_combo),
      this.findFlexRoutes(comp.comp_id, comp.trait_combo, allComps),
    ]);

    // Transform bestItems → carries (frontend shape)
    const carries: PlaybookCarryDto[] = bestItems.map((bi) => ({
      character_id: bi.unit,
      best_items: bi.combos.flatMap((combo) =>
        combo.items.map((itemId) => ({
          item_id: itemId,
          win_rate: combo.win_rate,
          sample_size: combo.sample_size,
        }))
      ),
    }));

    // Transform augmentPath → frontend shape (remove avg_placement)
    const augmentPathDto: PlaybookAugmentPathDto = {
      stage_2_1: augmentPath.stage_2_1.map((a) => ({
        augment_name: a.augment_name,
        win_rate: a.win_rate,
        top4_rate: a.top4_rate,
        sample_size: a.sample_size,
      })),
      stage_3_2: augmentPath.stage_3_2.map((a) => ({
        augment_name: a.augment_name,
        win_rate: a.win_rate,
        top4_rate: a.top4_rate,
        sample_size: a.sample_size,
      })),
      stage_4_2: augmentPath.stage_4_2.map((a) => ({
        augment_name: a.augment_name,
        win_rate: a.win_rate,
        top4_rate: a.top4_rate,
        sample_size: a.sample_size,
      })),
    };

    // Transform levelTiming → array format with typical round info
    const levelTimings: PlaybookLevelTimingDto[] = LEVEL_TIMING_DEFAULTS.map((lt) => {
      const dist = levelTiming.top_players_level_dist;
      const pct =
        lt.level === 6 ? dist.l6 : lt.level === 7 ? dist.l7 : lt.level === 8 ? dist.l8 : dist.l9;

      // Scale gold_needed by how common this level is (higher pct = earlier/cheaper)
      const goldAdjust = pct > 0.5 ? lt.gold_needed * 0.9 : lt.gold_needed;

      return {
        level: lt.level,
        typical_round: lt.typical_round,
        gold_needed: Math.round(goldAdjust),
      };
    });

    return {
      rank,
      comp_id: comp.comp_id,
      label: compLabel,
      tier: comp.tier,
      win_rate: comp.win_rate_num,
      avg_placement: comp.avg_placement_num,
      top4_rate: comp.top4_rate_num,
      sample_size: comp.sample_size_num,
      carries,
      augment_path: augmentPathDto,
      level_timings: levelTimings,
      flex_routes: flexRoutes,
    };
  }

  /**
   * Finds alternative comps that share traits with the given comp.
   * Returns shared trait names as shared_units (string[]).
   */
  private async findFlexRoutes(
    compId: string,
    traitCombo: string[],
    allComps: CompStatsRow[]
  ): Promise<PlaybookFlexRouteDto[]> {
    const traitSet = new Set(traitCombo);

    const candidates = allComps
      .filter((c) => c.comp_id !== compId)
      .map((c) => {
        const sharedTraits = c.trait_combo.filter((t) => traitSet.has(t));
        return { ...c, shared_traits: sharedTraits };
      })
      .filter((c) => c.shared_traits.length > 0)
      .sort((a, b) => b.shared_traits.length - a.shared_traits.length)
      .slice(0, MAX_FLEX_ROUTES);

    return Promise.all(
      candidates.map(async (c) => {
        const label = await this.friendlyNameService.resolveCompLabel(c.trait_combo);
        return {
          comp_id: c.comp_id,
          label,
          win_rate: parseFloat(c.win_rate),
          shared_units: c.shared_traits,
        };
      })
    );
  }
}
