# Rate Limiter Implementation

## Rate limit tiers

| Tier          | Dev Key      | Production Key |
| ------------- | ------------ | -------------- |
| Per second    | 20 req/s     | 100+ req/s     |
| Per 2 minutes | 100 req/2min | 1000+ req/2min |

Your code must respect ALL tiers simultaneously.

## Token bucket implementation

```typescript
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private buckets: Map<
    string,
    { tokens: number; max: number; refillRate: number; lastRefill: number }
  > = new Map();
  private globalPause = 0;

  constructor(private readonly configService: ConfigService) {
    const perSec = this.configService.get('riotApi.rateLimitPerSecond', 20);
    const per2Min = this.configService.get('riotApi.rateLimitPer2Min', 100);
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
      await this.sleep(this.globalPause - Date.now());
    }

    for (const [key, bucket] of this.buckets) {
      this.refill(bucket);
      if (bucket.tokens < 1) {
        const wait = Math.ceil(((1 - bucket.tokens) / bucket.refillRate) * 1000);
        this.logger.debug(`Waiting ${wait}ms for bucket ${key}`);
        await this.sleep(wait);
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

  getStatus() {
    const status: Record<string, { tokens: number; max: number }> = {};
    for (const [key, bucket] of this.buckets) {
      this.refill(bucket);
      status[key] = { tokens: Math.floor(bucket.tokens), max: bucket.max };
    }
    return status;
  }

  private refill(b: any) {
    const elapsed = (Date.now() - b.lastRefill) / 1000;
    b.tokens = Math.min(b.max, b.tokens + elapsed * b.refillRate);
    b.lastRefill = Date.now();
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
```

## Multi-region collection strategy

Distribute requests evenly across regions (round-robin) instead of sequential:

```typescript
async collectAllRegions(regions: Region[]) {
  const playerQueues = await Promise.all(
    regions.map(async (region) => {
      const players = await this.riotApi.getAllTopPlayers(region);
      return players.map((p) => ({ ...p, region }));
    }),
  );

  // Interleave to avoid bursting one region
  const interleaved = this.interleave(playerQueues);
  for (const player of interleaved) {
    await this.enqueuePlayerCollection(player);
  }
}
```
