import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { EventEmitter } from 'events';
import { SYSTEM_QUEUE } from './jobs.constants';

/**
 * Singleton service that wraps BullMQ QueueEvents.
 * Listens to Redis pub/sub for system-jobs queue and re-emits
 * job IDs on a local EventEmitter so the SSE endpoint can subscribe.
 */
@Injectable()
export class JobsEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsEventsService.name);
  readonly emitter = new EventEmitter();
  private queueEvents!: QueueEvents;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    this.queueEvents = new QueueEvents(SYSTEM_QUEUE, {
      connection: { host, port },
    });

    const notify = (jobId: string) => this.emitter.emit('job.change', jobId);

    this.queueEvents.on('waiting', ({ jobId }) => notify(jobId));
    this.queueEvents.on('active', ({ jobId }) => notify(jobId));
    this.queueEvents.on('progress', ({ jobId }) => notify(jobId));
    this.queueEvents.on('completed', ({ jobId }) => notify(jobId));
    this.queueEvents.on('failed', ({ jobId }) => notify(jobId));

    this.logger.log('[JobsEvents] Subscribed to system-jobs queue events');
  }

  onModuleDestroy() {
    this.queueEvents.close().catch(() => {});
  }
}
