import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ALL_REGIONS, Region } from '../riot-api/constants/regions.constants';
import { QUEUE_NAMES, JOB_NAMES } from './constants/queue.constants';

interface CollectRegionJobData {
  region: Region;
  tiers: Array<'CHALLENGER' | 'GRANDMASTER' | 'MASTER'>;
}

/**
 * Scheduler for the data-collection pipeline.
 *
 * Runs on a 30-minute cron schedule and enqueues one `collect-region` job
 * per region into the 'match-collection' queue. Each job is given priority 5
 * (standard scheduled collection priority) with a unique jobId that includes
 * the current timestamp to prevent BullMQ deduplication from silently dropping runs.
 *
 * The scheduler itself is intentionally lightweight — it does zero heavy work.
 * All heavy lifting is done inside DataCollectorProcessor.
 */
@Injectable()
export class CollectorSchedulerService {
  private readonly logger = new Logger(CollectorSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.MATCH_COLLECTION)
    private readonly matchQueue: Queue<CollectRegionJobData>,
    @InjectQueue(QUEUE_NAMES.VIEW_REFRESH)
    private readonly viewRefreshQueue: Queue
  ) {}

  /**
   * Fires at second 0 of every 30th minute: 00:00, 00:30, 01:00, 01:30, …
   *
   * Cron expression breakdown: `0 *\/30 * * * *`
   *  - 0          → second 0
   *  - *\/30       → every 30 minutes
   *  - * * * *    → every hour, every day, every month, every weekday
   */
  @Cron('0 */30 * * * *')
  async scheduleRegionCollection(): Promise<void> {
    const queueDepth = await this.matchQueue.count();
    this.logger.log(`[Scheduler] Cron fired — queue depth before enqueue: ${queueDepth} jobs`);

    const batchId = Date.now();
    const tiers: Array<'CHALLENGER' | 'GRANDMASTER' | 'MASTER'> = [
      'CHALLENGER',
      'GRANDMASTER',
      'MASTER',
    ];

    const jobs = ALL_REGIONS.map((region) => ({
      name: JOB_NAMES.COLLECT_REGION,
      data: { region, tiers } satisfies CollectRegionJobData,
      opts: {
        // Include timestamp in jobId so each cron run creates fresh jobs.
        jobId: `collect-region-${region}-${batchId}`,
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2_000, age: 7 * 24 * 3_600 },
      },
    }));

    await this.matchQueue.addBulk(jobs);

    this.logger.log(
      `[Scheduler] Enqueued ${ALL_REGIONS.length} collect-region jobs ` +
        `(batch ${batchId}): ${ALL_REGIONS.join(', ')}`
    );
  }

  /**
   * Enqueues a materialized-view refresh job every 30 minutes.
   *
   * Priority 3 keeps view refreshes above regular collection (5) but below
   * user-facing alerts (1). A unique jobId per run avoids BullMQ deduplication.
   */
  @Cron('0 */30 * * * *')
  async scheduleViewRefresh(): Promise<void> {
    const jobId = `refresh-views-${Date.now()}`;

    await this.viewRefreshQueue.add(
      JOB_NAMES.REFRESH_VIEWS,
      {},
      {
        jobId,
        priority: 3,
        attempts: 2,
        backoff: { type: 'fixed' as const, delay: 30_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 200 },
      }
    );

    this.logger.log(`[Scheduler] Enqueued view-refresh job (${jobId})`);
  }
}
