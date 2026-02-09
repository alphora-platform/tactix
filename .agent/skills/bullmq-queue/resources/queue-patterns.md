# Advanced Queue Patterns

## Repeatable jobs (alternative to @nestjs/schedule)

Jobs persist in Redis and survive restarts:

```typescript
async onModuleInit() {
  await this.matchQueue.add('collect-region', { region: 'NA' }, {
    repeat: { pattern: '*/30 * * * *' },
    jobId: 'repeatable-collect-NA',
  });
}
```

## Flow jobs (parent-child)

Parent waits for all children to complete:

```typescript
const flowProducer = new FlowProducer({ connection: redisConfig });

await flowProducer.add({
  name: 'etl-complete',
  queueName: 'etl-pipeline',
  data: { region, totalPlayers: players.length },
  children: players.map((puuid) => ({
    name: 'collect-player-matches',
    queueName: 'match-collection',
    data: { puuid, region },
  })),
});
```

## Graceful shutdown

```typescript
// main.ts
app.enableShutdownHooks();

// In processor
@Processor('match-collection')
export class Processor extends WorkerHost implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.worker?.close(); // Wait for active jobs
  }
}
```

## Dead letter queue

```typescript
@OnWorkerEvent('failed')
async onFailed(job: Job, error: Error) {
  if (job.attemptsMade >= job.opts.attempts) {
    await this.dlqQueue.add('dead-letter', {
      originalJob: job.name,
      originalData: job.data,
      error: error.message,
      attempts: job.attemptsMade,
    });
  }
}
```

## Testing processors

```typescript
describe('DataCollectorProcessor', () => {
  let processor: DataCollectorProcessor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DataCollectorProcessor,
        {
          provide: RiotApiService,
          useValue: {
            getMatchIdsByPuuid: jest.fn(),
            getMatchDetail: jest.fn(),
          },
        },
        { provide: MatchParser, useValue: { parseMatch: jest.fn() } },
        {
          provide: getQueueToken('match-collection'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();
    processor = module.get(DataCollectorProcessor);
  });

  it('should collect player matches', async () => {
    const job = {
      name: 'collect-player-matches',
      data: { puuid: 'test', region: 'NA' },
      updateProgress: jest.fn(),
    } as any;
    const result = await processor.process(job);
    expect(result).toBeDefined();
  });
});
```
