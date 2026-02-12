import { Injectable, Logger } from '@nestjs/common';

interface Bucket {
  tokens: number;
  max: number;
  refillRate: number; // tokens per second
  lastRefill: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, Bucket>();
  private globalPause = 0;

  constructor() {
    // Development key limits: 20 req/s, 100 req/2min
    const perSec = 20;
    const per2Min = 100;

    this.buckets.set('1s', {
      tokens: perSec,
      max: perSec,
      refillRate: perSec,
      lastRefill: Date.now(),
    });

    this.buckets.set('2m', {
      tokens: per2Min,
      max: per2Min,
      refillRate: per2Min / 120,
      lastRefill: Date.now(),
    });
  }

  async acquire(): Promise<void> {
    // Check global pause from 429
    if (this.globalPause > Date.now()) {
      const waitMs = this.globalPause - Date.now();
      this.logger.warn(`Global rate limit pause, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
    }

    for (const [key, bucket] of this.buckets) {
      this.refill(bucket);
      if (bucket.tokens < 1) {
        const waitMs = Math.ceil(((1 - bucket.tokens) / bucket.refillRate) * 1000);
        this.logger.debug(`Waiting ${waitMs}ms for bucket ${key}`);
        await this.sleep(waitMs);
        this.refill(bucket);
      }
      bucket.tokens -= 1;
    }
  }

  updateFromHeaders(headers: Record<string, string>): void {
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      this.globalPause = Date.now() + parseInt(retryAfter, 10) * 1000;
      this.logger.warn(`Rate limited! Pausing ${retryAfter}s`);
    }
  }

  getStatus(): Record<string, { tokens: number; max: number }> {
    const status: Record<string, { tokens: number; max: number }> = {};
    for (const [key, bucket] of this.buckets) {
      this.refill(bucket);
      status[key] = { tokens: Math.floor(bucket.tokens), max: bucket.max };
    }
    return status;
  }

  private refill(bucket: Bucket): void {
    const elapsed = (Date.now() - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(bucket.max, bucket.tokens + elapsed * bucket.refillRate);
    bucket.lastRefill = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
