import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { PatchAnalyzerModule } from './modules/patch-analyzer/patch-analyzer.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { RawDataModule } from './modules/raw-data/raw-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// Determine mode
const appMode = process.env.APP_MODE || 'api'; // default 'api'

const baseModules: any[] = [
  AppConfigModule,
  BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      connection: {
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000 },
      },
    }),
  }),
  ScheduleModule.forRoot(),
  DatabaseModule,
  RiotApiModule,
  MetadataModule,
  AuthModule,
];

const featureModules = [];

if (appMode === 'api') {
  featureModules.push(
    AnalyticsModule,
    DataCollectorModule,
    TrackerModule,
    PatchAnalyzerModule,
    RawDataModule
  );
} else if (appMode === 'worker') {
  featureModules.push(
    AnalyticsModule,
    DataCollectorModule,
    AlertsModule,
    TrackerModule,
    PatchAnalyzerModule,
    RawDataModule
  );
} else {
  // 'all' or undefined
  featureModules.push(
    AnalyticsModule,
    AlertsModule,
    DataCollectorModule,
    TrackerModule,
    PatchAnalyzerModule,
    RawDataModule
  );
}

@Module({
  imports: [...baseModules, ...featureModules],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
