import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';
import { PlacementAnalysisService } from './placement-analysis.service';
import { CompProficiencyService } from './comp-proficiency.service';
import { EconCurveService } from './econ-curve.service';
import { ItemEfficiencyService } from './item-efficiency.service';
import { TiltDetectionService } from './tilt-detection.service';
import { WeaknessReportService } from './weakness-report.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Participant, Match, ParticipantTrait, ParticipantUnit } from '../../database/entities';

/**
 * TrackerModule — Personal Performance Tracker
 *
 * Phase 1 endpoints (placement + proficiency):
 *   GET /tracker/:puuid/placements?patch=   → placement distribution + breakdowns
 *   GET /tracker/:puuid/recent?limit=       → recent ranked games with comp labels
 *   GET /tracker/:puuid/proficiency?patch=  → comp proficiency vs. meta average
 *
 * Phase 2 endpoints (advanced analysis):
 *   GET /tracker/:puuid/econ?compId=&patch= → econ curve per level bucket
 *   GET /tracker/:puuid/items?patch=        → item efficiency vs. meta win rate
 *   GET /tracker/:puuid/tilt               → tilt detection (last 20 games)
 *   GET /tracker/:puuid/report/weekly      → weekly weakness report
 *
 * Dependencies:
 *   - TypeOrmModule.forFeature([...]) — entity registration for type safety.
 *   - AnalyticsModule                 — re-exports CompDetectionService.
 *
 * DataSource is provided globally by DatabaseModule — services use raw queries.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, Match, ParticipantTrait, ParticipantUnit]),
    AnalyticsModule, // provides CompDetectionService
  ],
  controllers: [TrackerController],
  providers: [
    TrackerService,
    // Phase 1
    PlacementAnalysisService,
    CompProficiencyService,
    // Phase 2
    EconCurveService,
    ItemEfficiencyService,
    TiltDetectionService,
    WeaknessReportService,
  ],
  exports: [TrackerService, EconCurveService],
})
export class TrackerModule {}
