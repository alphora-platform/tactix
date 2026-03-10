import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawDataController } from './raw-data.controller';
import { RawDataService } from './raw-data.service';
import { Match } from '../../database/entities/match.entity';
import { Player } from '../../database/entities/player.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Player])],
  controllers: [RawDataController],
  providers: [RawDataService],
  exports: [RawDataService],
})
export class RawDataModule {}
