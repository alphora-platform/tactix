import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { SettingsModule } from '../settings/settings.module';
import { SYSTEM_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: SYSTEM_QUEUE }),
    SettingsModule,
  ],
  controllers: [JobsController],
  providers: [JobsProcessor],
})
export class JobsModule {}
