import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
  ],
  controllers: [DataCollectorController],
  providers: [DataCollectorService, MatchParser],
  exports: [DataCollectorService],
})
export class DataCollectorModule {}
