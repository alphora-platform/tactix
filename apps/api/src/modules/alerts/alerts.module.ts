import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AlertsService } from './alerts.service';
import { NotificationService } from './notification.service';
import { MetaShiftProcessor } from './processors/meta-shift.processor';
import { NewCompProcessor } from './processors/new-comp.processor';
import { PatchDropProcessor } from './processors/patch-drop.processor';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ALERTS_REDIS_CLIENT } from './constants/alerts.constants';
import { QUEUE_NAMES } from '../data-collector/constants/queue.constants';

// Processors must ONLY run in the worker process.
// AlertsModule is also imported by DataCollectorModule (api mode)
// to provide the ALERTS queue for the scheduler — so the queue registration
// is unconditional, but the processor providers are guarded.
const isWorker = process.env.APP_MODE === 'worker';

const alertProcessors = isWorker ? [MetaShiftProcessor, NewCompProcessor, PatchDropProcessor] : [];

/**
 * AlertsModule — Worker Module (no controller).
 *
 * Owns the `alert-notifications` BullMQ queue and three processors that
 * detect meta shifts, new comps, and patch drops, then push to Discord/Telegram.
 *
 * Design choices:
 *  - Dedicated ioredis client (ALERTS_REDIS_CLIENT) for snapshot caching so
 *    alert state is isolated from the analytics tier-list cache.
 *  - All three processors share the same queue (QUEUE_NAMES.ALERTS / 'alerts').
 *    They discriminate on `job.name` inside their `process()` method.
 *  - `AnalyticsModule` is imported to access `CompDetectionService` for labels.
 *  - `attempts: 1` for all alert jobs — next cron run acts as the retry.
 */
@Module({
  imports: [
    ConfigModule,
    AnalyticsModule,

    // ── Alert queue ────────────────────────────────────────────────────────
    // No retry — alerts are best-effort fire-and-forget.
    // The next scheduled cron serves as the natural retry.
    BullModule.registerQueue({
      name: QUEUE_NAMES.ALERTS,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500, age: 3 * 24 * 3_600 }, // Keep failures 3 days for debugging
      },
    }),
    BullModule.registerQueue({
      name: 'patch-analysis',
    }),
  ],

  providers: [
    // ── Dedicated Redis client for alert snapshots ─────────────────────────
    {
      provide: ALERTS_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
    },

    NotificationService,
    AlertsService,

    // Processors — only active in APP_MODE=worker
    ...alertProcessors,
  ],

  exports: [
    // Export AlertsService so DataCollectorModule's scheduler can inject the queue
    // via `@InjectQueue(QUEUE_NAMES.ALERTS)` after importing AlertsModule.
    AlertsService,
    // Export the BullMQ queue registration so importing modules can inject the queue.
    BullModule,
  ],
})
export class AlertsModule {}
