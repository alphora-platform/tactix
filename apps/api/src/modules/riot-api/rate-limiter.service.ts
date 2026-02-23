import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface BucketConfig {
  /** Redis key prefix, e.g. "rl:1s" or "rl:2m". */
  key: string;
  /** Max requests allowed in the window. Dev key: 20/s | 100/2min. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * Redis-backed sliding window rate limiter.
 *
 * Shares state across all BullMQ worker processes via a single Redis connection.
 * Implements TWO simultaneous windows matching Riot's development-key limits:
 *   - 20 requests / 1 second
 *   - 100 requests / 2 minutes
 *
 * Uses an atomic Lua script to check + increment counters so concurrent
 * workers never race past a limit.
 */
@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis;

  /** Milliseconds until the global 429 pause expires (shared as a Redis key). */
  private readonly PAUSE_KEY = 'rl:global_pause';

  private readonly buckets: BucketConfig[];

  /**
   * Lua script: atomically increments a sliding-window counter.
   * Returns the current count AFTER incrementing.
   * KEYS[1] = Redis key, ARGV[1] = window ms, ARGV[2] = current epoch ms.
   */
  private readonly LUA_SLIDE = `local key = KEYS[1]
local window = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
redis.call('ZADD', key, now, now)
redis.call('PEXPIRE', key, window)
return redis.call('ZCARD', key)` as const;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: null, // required for BullMQ-compatible clients
      enableReadyCheck: false,
      lazyConnect: true,
    });

    this.redis.on('error', (err: Error) =>
      this.logger.error(`Redis rate-limiter error: ${err.message}`)
    );

    const perSec = this.configService.get<number>('RIOT_RATE_LIMIT_PER_SEC', 20);
    const per2Min = this.configService.get<number>('RIOT_RATE_LIMIT_PER_2MIN', 100);

    this.buckets = [
      { key: 'rl:1s', limit: perSec, windowMs: 1_000 },
      { key: 'rl:2m', limit: per2Min, windowMs: 120_000 },
    ];
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Acquire a token slot. Waits until both windows have capacity.
   * Called by `RiotApiClientService` before every outbound HTTP request.
   */
  async acquire(): Promise<void> {
    await this.waitForGlobalPause();

    for (const bucket of this.buckets) {
      await this.acquireBucket(bucket);
    }
  }

  /**
   * Called after receiving a 429 response.
   * Stores the pause expiry in Redis so ALL workers respect it.
   */
  async setGlobalPause(retryAfterSeconds: number): Promise<void> {
    const expiryEpochMs = Date.now() + retryAfterSeconds * 1_000;
    await this.redis.set(this.PAUSE_KEY, String(expiryEpochMs), 'PX', retryAfterSeconds * 1_000);
    this.logger.warn(`[RateLimiter] Global pause set: ${retryAfterSeconds}s (all workers paused)`);
  }

  /**
   * Inspect current bucket fill levels — useful for health endpoints.
   */
  async getStatus(): Promise<Record<string, { used: number; limit: number }>> {
    const status: Record<string, { used: number; limit: number }> = {};
    const now = Date.now();
    for (const bucket of this.buckets) {
      const cutoff = now - bucket.windowMs;
      const used = await this.redis.zcount(bucket.key, cutoff, '+inf');
      status[bucket.key] = { used, limit: bucket.limit };
    }
    return status;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private async waitForGlobalPause(): Promise<void> {
    const raw = await this.redis.get(this.PAUSE_KEY);
    if (!raw) return;

    const expiryMs = parseInt(raw, 10);
    const waitMs = expiryMs - Date.now();
    if (waitMs > 0) {
      this.logger.warn(`[RateLimiter] Global pause active, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
    }
  }

  private async acquireBucket(bucket: BucketConfig): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const count = await this.redis.eval(
        this.LUA_SLIDE,
        1,
        bucket.key,
        String(bucket.windowMs),
        String(Date.now())
      );

      const current = Number(count);

      if (current <= bucket.limit) {
        // Token acquired — remove the entry we just added if over? No: sliding
        // window counts events; we already added ours. If within limit, proceed.
        return;
      }

      // Over limit — undo our entry by removing it, then wait for the window to slide.
      await this.redis.zremrangebyrank(bucket.key, -1, -1);

      // Wait roughly until the oldest entry in this window expires.
      const oldest = await this.redis.zrange(bucket.key, 0, 0, 'WITHSCORES');
      const oldestMs = oldest.length >= 2 ? Number(oldest[1]) : Date.now();
      const waitMs = Math.max(50, oldestMs + bucket.windowMs - Date.now() + 1);

      this.logger.debug(
        `[RateLimiter] Bucket ${bucket.key} at capacity (${current - 1}/${bucket.limit}), ` +
          `waiting ${waitMs}ms`
      );
      await this.sleep(waitMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
