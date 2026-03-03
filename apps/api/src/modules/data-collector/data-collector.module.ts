import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Player,
  Match,
  Participant,
  ParticipantUnit,
  ParticipantTrait,
  ParticipantAugment,
  MetaSnapshot,
} from '../../database/entities';
import { RiotApiModule } from '../riot-api/riot-api.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DataCollectorService } from './data-collector.service';
import { DataCollectorController } from './data-collector.controller';
import { MatchParser } from './match.parser';
import { DataCollectorProcessor } from './data-collector.processor';
import { CollectorSchedulerService } from './collector-scheduler.service';
import { EtlService } from './etl.service';
import { EtlProcessor } from './etl.processor';
import { ViewRefreshService } from '../../database/view-refresh.service';
import { ViewRefreshProcessor } from './view-refresh.processor';
import { QUEUE_NAMES } from './constants/queue.constants';

// Processors and scheduler must ONLY run in the worker process.
// Registering them in the api process would cause the api to consume queue jobs
// and emit worker-level logs (RateLimiter, Fetching match details, etc.).
const isWorker = process.env.APP_MODE === 'worker';

const workerOnlyProviders = isWorker
  ? [DataCollectorProcessor, CollectorSchedulerService, EtlProcessor, ViewRefreshProcessor]
  : [];

@Module({
  imports: [
    RiotApiModule,
    AlertsModule, // Provides QUEUE_NAMES.ALERTS queue to CollectorSchedulerService
    AnalyticsModule, // Provides MetaStatsService for patch sync in EtlService
    TypeOrmModule.forFeature([
      Player,
      Match,
      Participant,
      ParticipantUnit,
      ParticipantTrait,
      ParticipantAugment,
      MetaSnapshot,
    ]),

    // ── Match collection queue ────────────────────────────────────────
    BullModule.registerQueue({
      name: QUEUE_NAMES.MATCH_COLLECTION,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 }, // 5s → 10s → 20s
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2_000, age: 7 * 24 * 3_600 },
      },
    }),

    // ── ETL pipeline queue ────────────────────────────────────────────
    BullModule.registerQueue({
      name: QUEUE_NAMES.ETL_PIPELINE,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10_000 }, // Fixed 10s retry
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000, age: 7 * 24 * 3_600 },
      },
    }),

    // ── View refresh queue ────────────────────────────────────────────
    BullModule.registerQueue({
      name: QUEUE_NAMES.VIEW_REFRESH,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 30_000 }, // 30s fixed retry
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 200 },
      },
    }),
  ],
  controllers: [DataCollectorController],
  providers: [
    // Always available — used by controllers and other modules
    DataCollectorService,
    MatchParser,
    EtlService,
    ViewRefreshService,

    // Workers and scheduler — only active in APP_MODE=worker
    ...workerOnlyProviders,
  ],
  exports: [DataCollectorService, EtlService, ViewRefreshService],
})
export class DataCollectorModule {}
