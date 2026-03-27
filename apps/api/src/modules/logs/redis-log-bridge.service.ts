import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LogBufferService, LogEntry } from './log-buffer.service';

const CHANNEL = 'tactix:worker:logs';

/**
 * Bridges worker logs → API via Redis pub/sub.
 *
 * - In worker mode: listens to LogBufferService and publishes entries to Redis.
 * - In API mode: subscribes to the Redis channel and injects entries into LogBufferService
 *   so they appear in the SSE stream alongside API logs.
 */
@Injectable()
export class RedisLogBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly appMode = process.env.APP_MODE || 'api';
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(
    private readonly logBuffer: LogBufferService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    if (this.appMode === 'worker') {
      this.publisher = new Redis({ host, port, lazyConnect: false });
      this.logBuffer.emitter.on('log.entry', (entry: LogEntry) => {
        this.publisher!.publish(CHANNEL, JSON.stringify(entry)).catch(() => {});
      });
    } else {
      // api mode — subscribe and forward into local buffer
      this.subscriber = new Redis({ host, port, lazyConnect: false });
      this.subscriber.subscribe(CHANNEL).catch(() => {});
      this.subscriber.on('message', (_channel: string, message: string) => {
        try {
          const entry: Omit<LogEntry, 'id'> = JSON.parse(message);
          this.logBuffer.pushExternal({ ...entry, source: 'worker' });
        } catch {
          // ignore malformed messages
        }
      });
    }
  }

  onModuleDestroy() {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
  }
}
