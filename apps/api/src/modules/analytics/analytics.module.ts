import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CompDetectionService } from './comp-detection.service';
import { MetaStatsService } from './meta-stats.service';
import { TrendAnalysisService } from './trend-analysis.service';
import { TierClassificationService } from './tier-classification.service';
import { CompAnalyzerService } from './comp-analyzer.service';
import { RegionComparisonService } from './region-comparison.service';
import { ANALYTICS_REDIS_CLIENT } from './constants/analytics.constants';

/**
 * AnalyticsModule — API + Worker (Phase 2)
 *
 * Provides:
 *   GET /analytics/meta          → top comps from mv_comp_stats (trend + tier)
 *   GET /analytics/tier-list     → S/A/B/C tier list (cached in Redis 30 min)
 *   GET /analytics/trend/:compId → full trend breakdown for a single comp
 *
 * Services available for import by other modules:
 *   - AnalyticsService           (facade)
 *   - CompDetectionService       (pure hashing / labelling, no DB)
 *   - MetaStatsService           (raw queries against mv_comp_stats)
 *   - TrendAnalysisService       (trend direction + meta snapshot from mv_comp_trend)
 *   - TierClassificationService  (S/A/B/C classification + Redis-cached tier list)
 *
 * TypeORM DataSource is provided globally by DatabaseModule — no
 * forFeature() call needed here since we use raw queries only.
 *
 * Redis: a dedicated ioredis client (ANALYTICS_REDIS_CLIENT) is created from
 * REDIS_HOST / REDIS_PORT env vars and used only for tier-list caching. It is
 * kept separate from the BullMQ connection to avoid command interference.
 */
@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    CompDetectionService,
    MetaStatsService,
    TrendAnalysisService,
    TierClassificationService,
    CompAnalyzerService,
    RegionComparisonService,

    // Dedicated ioredis client for analytics caching (not shared with BullMQ).
    {
      provide: ANALYTICS_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // Reconnect automatically; analytics cache is non-critical.
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
    },
  ],
  exports: [
    AnalyticsService,
    CompDetectionService,
    MetaStatsService,
    TrendAnalysisService,
    TierClassificationService,
    CompAnalyzerService,
    RegionComparisonService,
  ],
})
export class AnalyticsModule {}
