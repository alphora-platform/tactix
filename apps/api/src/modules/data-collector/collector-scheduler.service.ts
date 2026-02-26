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

/** Shared alert job options — no retry, high priority. */
const ALERT_JOB_OPTS = {
  priority: 1,
  attempts: 1,
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
} as const;

/**
 * Scheduler for the data-collection pipeline.
 *
 * Runs on a 30-minute cron schedule and enqueues one `collect-region` job
 * per region into the 'match-collection' queue. Each job is given priority 5
 * (standard scheduled collection priority) with a unique jobId that includes
 * the current timestamp to prevent BullMQ deduplication from silently dropping runs.
 *
 * Also schedules three alert checks:
 *   - check-meta-shift  → hourly
 *   - check-new-comp    → every 6 hours
 *   - check-patch-drop  → every 30 minutes (same cadence as data collection)
 *
 * The scheduler itself is intentionally lightweight — it does zero heavy work.
 * All heavy lifting is done inside DataCollectorProcessor and the alert processors.
 */
@Injectable()
export class CollectorSchedulerService {
  private readonly logger = new Logger(CollectorSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.MATCH_COLLECTION)
    private readonly matchQueue: Queue<CollectRegionJobData>,
    @InjectQueue(QUEUE_NAMES.VIEW_REFRESH)
    private readonly viewRefreshQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ALERTS)
    private readonly alertQueue: Queue
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

  // ── Alert schedules ────────────────────────────────────────────────────────

  /**
   * Checks for meta shifts every hour.
   *
   * Compares current mv_comp_stats against the 12h-ago Redis snapshot.
   * Alerts if win_rate or play_rate delta exceeds thresholds.
   *
   * Cron: `0 0 * * * *` — second 0, minute 0, every hour.
   */
  @Cron('0 0 * * * *')
  async scheduleMetaShiftCheck(): Promise<void> {
    const jobId = `meta-shift-${Date.now()}`;
    await this.alertQueue.add(
      JOB_NAMES.CHECK_META_SHIFT,
      { threshold: 0.03 },
      { ...ALERT_JOB_OPTS, jobId }
    );
    this.logger.log(`[Scheduler] Enqueued meta-shift check (${jobId})`);
  }

  /**
   * Scans for brand-new comps every 6 hours.
   *
   * Finds comp_ids not present in the Redis registry (first seen > 48h threshold).
   * Alerts if a new comp has win_rate >= 55% and sample_size >= 30.
   *
   * Cron: `0 0 */6 * * *` — second 0, minute 0, every 6th hour.
   */
  @Cron('0 0 */6 * * *')
  async scheduleNewCompCheck(): Promise<void> {
    const jobId = `new-comp-${Date.now()}`;
    await this.alertQueue.add(
      JOB_NAMES.CHECK_NEW_COMP,
      {},
      { ...ALERT_JOB_OPTS, jobId }
    );
    this.logger.log(`[Scheduler] Enqueued new-comp check (${jobId})`);
  }

  /**
   * Checks for patch drops every 30 minutes.
   *
   * Runs on the same cadence as data collection so that as soon as new matches
   * arrive after a patch, the version change is detected within one cycle.
   * Also invalidates the tier-list Redis cache on detection.
   *
   * Cron: `0 */30 * * * *` — every 30 minutes.
   */
  @Cron('0 */30 * * * *')
  async schedulePatchDropCheck(): Promise<void> {
    const jobId = `patch-drop-${Date.now()}`;
    await this.alertQueue.add(
      JOB_NAMES.CHECK_PATCH_DROP,
      {},
      { ...ALERT_JOB_OPTS, jobId }
    );
    this.logger.debug(`[Scheduler] Enqueued patch-drop check (${jobId})`);
  }
}

