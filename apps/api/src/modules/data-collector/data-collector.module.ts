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
import { DataCollectorService } from './data-collector.service';
import { DataCollectorController } from './data-collector.controller';
import { MatchParser } from './match.parser';
import { DataCollectorProcessor } from './data-collector.processor';
import { CollectorSchedulerService } from './collector-scheduler.service';
import { EtlService } from './etl.service';
import { EtlProcessor } from './etl.processor';
import { QUEUE_NAMES } from './constants/queue.constants';

@Module({
  imports: [
    RiotApiModule,
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
  ],
  controllers: [DataCollectorController],
  providers: [
    // Collection pipeline
    DataCollectorService,
    MatchParser,
    DataCollectorProcessor,
    CollectorSchedulerService,

    // ETL pipeline
    EtlService,
    EtlProcessor,
  ],
  exports: [DataCollectorService, EtlService],
})
export class DataCollectorModule {}
