---
name: bullmq-queue
description: Manages background job processing for Tactix using BullMQ and Redis. Covers queue setup, job producers and consumers, scheduled tasks, retry strategies, priority queues, rate limiting, and monitoring. Use when creating queues, processors, scheduled jobs, implementing retry logic, or debugging failed jobs.
---

# BullMQ Queue System

Manages all background processing for Tactix: data collection from Riot API, ETL pipeline, materialized view refreshes, and alert notifications.

## When to use this skill

- Creating a new job queue or processor
- Setting up scheduled/cron tasks that enqueue jobs
- Implementing retry logic or error handling for jobs
- Adding job priorities or rate limiting within queues
- Monitoring queue health or debugging failed jobs
- Connecting the scheduler to data collection pipeline

## Decision tree

```
What queue task?
├── New background task
│   ├── Triggered by cron → Scheduler enqueues job
│   ├── Triggered by API call → Service enqueues job
│   └── Triggered by another job → Flow jobs (parent-child)
├── Processing logic
│   ├── Single job type per queue → Simple processor
│   └── Multiple job types → Switch on job.name
├── Error handling
│   ├── Transient error (API timeout) → Exponential backoff retry
│   ├── Permanent error (not found) → Return result, don't retry
│   └── Rate limit (429) → Delay job, don't count as attempt
├── Performance
│   ├── Too slow → Increase concurrency
│   ├── Hitting API limits → Add limiter to processor
│   └── Queue growing → Check if processor is stuck
└── Monitoring
    → See resources/monitoring.md
```

## Setup

### Root module

```typescript
// app.module.ts
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get('REDIS_PORT', 6379),
      maxRetriesPerRequest: null, // Required by BullMQ
    },
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  }),
});
```

### Feature module

```typescript
// data-collector.module.ts
BullModule.registerQueue({
  name: 'match-collection',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000, age: 7 * 24 * 3600 },
  },
});
```

## Queue names

```typescript
export const QUEUE_NAMES = {
  MATCH_COLLECTION: 'match-collection',
  ETL_PIPELINE: 'etl-pipeline',
  META_ANALYSIS: 'meta-analysis',
  ALERTS: 'alerts',
  VIEW_REFRESH: 'view-refresh',
} as const;

export const JOB_NAMES = {
  COLLECT_REGION: 'collect-region',
  COLLECT_PLAYER: 'collect-player-matches',
  PARSE_MATCHES: 'parse-matches',
  DETECT_COMPS: 'detect-comps',
  CHECK_META_SHIFT: 'check-meta-shift',
  SEND_DISCORD_ALERT: 'send-discord-alert',
  REFRESH_VIEWS: 'refresh-materialized-views',
} as const;
```

## Producer (enqueuing jobs)

```typescript
@Injectable()
export class DataCollectorService {
  constructor(
    @InjectQueue('match-collection') private readonly matchQueue: Queue
  ) {}

  async enqueueRegionCollection(region: string) {
    await this.matchQueue.add(
      'collect-region',
      { region, tiers: ['CHALLENGER', 'GRANDMASTER', 'MASTER'] },
      { jobId: `region-${region}-${Date.now()}`, priority: 5 }
    );
  }

  async enqueueBatch(players: Array<{ puuid: string; region: string }>) {
    const jobs = players.map((p) => ({
      name: 'collect-player-matches',
      data: { puuid: p.puuid, region: p.region },
      opts: { priority: 5 },
    }));
    await this.matchQueue.addBulk(jobs);
  }
}
```

## Consumer (processing jobs)

```typescript
@Processor('match-collection', {
  concurrency: 5,
  limiter: { max: 15, duration: 1000 }, // Stay under Riot's 20/s
})
export class DataCollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(DataCollectorProcessor.name);

  constructor(
    private readonly riotApi: RiotApiService,
    private readonly matchParser: MatchParser,
    private readonly dataSource: DataSource
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'collect-region':
        return this.collectRegion(job);
      case 'collect-player-matches':
        return this.collectPlayer(job);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private async collectPlayer(job: Job) {
    const { puuid, region } = job.data;
    const matchIds = await this.riotApi.getMatchIdsByPuuid(region, puuid, 20);
    await job.updateProgress(30);

    let collected = 0,
      errors = 0;
    for (const matchId of matchIds) {
      try {
        const raw = await this.riotApi.getMatchDetail(region, matchId);
        const parsed = this.matchParser.parseMatch(raw);
        if (parsed) {
          await this.saveBundle(parsed);
          collected++;
        }
      } catch (e) {
        errors++;
      }
    }
    return { newMatches: collected, errors };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ ${job.name} [${job.id}] done`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `❌ ${job.name} [${job.id}] failed (${job.attemptsMade}/${job.opts.attempts}): ${err.message}`
    );
  }
}
```

## Scheduler (cron → queue)

The scheduler enqueues jobs — it never does heavy work itself:

```typescript
@Injectable()
export class SchedulerService {
  constructor(
    @InjectQueue('match-collection') private matchQueue: Queue,
    @InjectQueue('view-refresh') private viewQueue: Queue,
    @InjectQueue('alerts') private alertQueue: Queue
  ) {}

  @Cron('0 */30 * * * *') // Every 30 min
  async scheduleCollection() {
    for (const region of ['NA', 'EUW', 'KR', 'EUNE', 'BR', 'JP', 'OCE', 'TR']) {
      await this.matchQueue.add('collect-region', { region }, { priority: 5 });
    }
  }

  @Cron('0 */30 * * * *')
  async scheduleViewRefresh() {
    await this.viewQueue.add('refresh-materialized-views', {}, { priority: 3 });
  }

  @Cron('0 0 * * * *') // Every hour
  async scheduleAlertCheck() {
    await this.alertQueue.add(
      'check-meta-shift',
      { threshold: 0.03 },
      { priority: 1 }
    );
  }
}
```

## Priority guide

| Priority    | Use Case                       |
| ----------- | ------------------------------ |
| 1 (highest) | Alerts, user-initiated lookups |
| 2           | Analytics (comp detection)     |
| 3           | View refreshes                 |
| 5 (default) | Scheduled data collection      |
| 10 (lowest) | Backfill, cleanup              |

## Error handling strategies

```typescript
// API calls: exponential backoff
{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }

// ETL: fixed delay
{ attempts: 2, backoff: { type: 'fixed', delay: 10000 } }

// Alerts: no retry (next cron will catch it)
{ attempts: 1 }

// In processor: handle specific errors
async process(job: Job) {
  try { return await this.doWork(job); }
  catch (error) {
    if (error instanceof RiotApiRateLimitException) {
      await job.moveToDelayed(Date.now() + error.retryAfter * 1000);
      return; // Don't count as failed attempt
    }
    if (error instanceof RiotApiNotFoundException) {
      return { skipped: true }; // Don't retry
    }
    throw error; // Let BullMQ retry
  }
}
```

## Common pitfalls

- **Missing `maxRetriesPerRequest: null`** in Redis config → connection timeout errors
- **Same `jobId`** → BullMQ silently drops duplicates. Include timestamps.
- **Concurrency > API limit** → Rate limit violations. Match to API limits.
- **No `removeOnComplete`** → Memory leak from completed jobs in Redis
- **Not handling stalled jobs** → Set `stalledInterval`, listen for `stalled` event

## Additional resources

See `resources/queue-patterns.md` for flow jobs, repeatable jobs, graceful shutdown, and DLQ.
See `resources/monitoring.md` for health endpoints, Bull Board, and debugging failed jobs.
