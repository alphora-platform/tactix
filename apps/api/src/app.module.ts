import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './modules/config/config.module';
import { DatabaseModule } from './modules/database/database.module';
import { RiotApiModule } from './modules/riot-api/riot-api.module';
import { DataCollectorModule } from './modules/data-collector/data-collector.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TrackerModule } from './modules/tracker/tracker.module';
import { AlertsModule } from './modules/alerts/alerts.module';

@Module({
  imports: [
    // Config must be first — other modules depend on it.
    AppConfigModule,

    // BullMQ root connection — shared across all feature queues.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          maxRetriesPerRequest: null, // Required by BullMQ
        },
        defaultJobOptions: {
          removeOnComplete: { count: 1_000 },
          removeOnFail: { count: 5_000 },
        },
      }),
    }),

    // NestJS cron scheduler (used by CollectorSchedulerService).
    ScheduleModule.forRoot(),

    DatabaseModule,
    RiotApiModule,
    AnalyticsModule,
    AlertsModule,
    DataCollectorModule,
    TrackerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
