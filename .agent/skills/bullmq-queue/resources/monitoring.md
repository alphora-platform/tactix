# Queue Monitoring

## Health check endpoint

```typescript
@Controller('health')
export class HealthController {
  constructor(
    @InjectQueue('match-collection') private matchQueue: Queue,
    @InjectQueue('etl-pipeline') private etlQueue: Queue
  ) {}

  @Get()
  async getHealth() {
    const queues = await Promise.all([
      this.checkQueue('match-collection', this.matchQueue),
      this.checkQueue('etl-pipeline', this.etlQueue),
    ]);
    return {
      status: queues.every((q) => q.status === 'healthy') ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      queues,
    };
  }

  private async checkQueue(name: string, queue: Queue) {
    const [waiting, active, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return {
      name,
      status: failed > 100 ? 'unhealthy' : waiting > 10000 ? 'backlogged' : 'healthy',
      counts: { waiting, active, failed, delayed },
    };
  }
}
```

## Bull Board (optional web UI)

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

function setupBullBoard(app, queues: Queue[]) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');
  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });
  app.use('/admin/queues', serverAdapter.getRouter());
}
```

Install: `npm add @bull-board/api @bull-board/express`

## Debugging failed jobs

```typescript
@Get('queues/:name/failed')
async getFailedJobs(@Param('name') name: string) {
  const failed = await queue.getFailed(0, 20);
  return failed.map((job) => ({
    id: job.id, name: job.name, data: job.data,
    failedReason: job.failedReason, attemptsMade: job.attemptsMade,
  }));
}

@Post('queues/:name/retry/:jobId')
async retryJob(@Param('jobId') jobId: string) {
  const job = await queue.getJob(jobId);
  await job.retry();
  return { status: await job.getState() };
}
```

## Alert on queue problems

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async checkQueueHealth() {
  const stats = await this.getQueueStats();
  if (stats.failed > 100) {
    await this.alertService.sendDiscordAlert({
      title: '⚠️ High Queue Failure Rate',
      description: `${stats.failed} failed jobs`,
    });
  }
}
```
