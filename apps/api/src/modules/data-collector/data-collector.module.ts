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
} from '../../database/entities';
import { RiotApiModule } from '../riot-api/riot-api.module';
import { DataCollectorService } from './data-collector.service';
import { DataCollectorController } from './data-collector.controller';
import { MatchParser } from './match.parser';
import { DataCollectorProcessor } from './data-collector.processor';
import { CollectorSchedulerService } from './collector-scheduler.service';
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
    ]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.MATCH_COLLECTION,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 }, // 5s → 10s → 20s
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2_000, age: 7 * 24 * 3_600 },
      },
    }),
  ],
  controllers: [DataCollectorController],
  providers: [DataCollectorService, MatchParser, DataCollectorProcessor, CollectorSchedulerService],
  exports: [DataCollectorService],
})
export class DataCollectorModule {}
