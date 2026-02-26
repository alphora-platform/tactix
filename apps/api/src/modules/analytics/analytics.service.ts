import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  /**
   * AnalyticsService is the public facade for the analytics module.
   *
   * Higher-level orchestration (e.g. combining MetaStatsService and future
   * AugmentStatsService or ItemStatsService) lives here so controllers stay
   * thin and downstream modules only need to import AnalyticsModule.
   *
   * Heavy DB work is delegated to the specialised services:
   *   - MetaStatsService  → comp/meta statistics from mv_comp_stats
   *   - CompDetectionService → pure hashing / labelling helpers
   */
}
