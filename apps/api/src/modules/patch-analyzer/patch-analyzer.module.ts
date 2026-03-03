import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PatchPrediction } from '../../database/entities';
import { RiotApiModule } from '../riot-api/riot-api.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PatchAnalyzerController } from './patch-analyzer.controller';
import { PatchAnalyzerService } from './patch-analyzer.service';
import { PatchNotesParserService } from './patch-notes-parser.service';
import { ImpactScoringService } from './impact-scoring.service';
import { AccuracyTrackingService } from './accuracy-tracking.service';
import { PatchAnalysisProcessor } from './patch-analysis.processor';

const isWorker = process.env.APP_MODE === 'worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatchPrediction]),
    BullModule.registerQueue({
      name: 'patch-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }),
    RiotApiModule,
    AnalyticsModule,
  ],
  controllers: [PatchAnalyzerController],
  providers: [
    // Always available — used by controller and other modules
    PatchAnalyzerService,
    PatchNotesParserService,
    ImpactScoringService,
    AccuracyTrackingService,

    // Processor — only active in APP_MODE=worker
    ...(isWorker ? [PatchAnalysisProcessor] : []),
  ],
  exports: [PatchAnalyzerService],
})
export class PatchAnalyzerModule {}
