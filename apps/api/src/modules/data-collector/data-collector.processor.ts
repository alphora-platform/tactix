import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../../database/entities';
import { Region, ALL_REGIONS } from '../riot-api/constants/regions.constants';
import {
  RiotApiRateLimitException,
  RiotApiNotFoundException,
} from '../riot-api/exceptions/riot-api.exceptions';
import { DataCollectorService } from './data-collector.service';
import { JOB_NAMES, QUEUE_NAMES } from './constants/queue.constants';

// ─── Job payload types ──────────────────────────────────────────────────────

interface CollectRegionJobData {
  region: Region;
  tiers?: Array<'CHALLENGER' | 'GRANDMASTER' | 'MASTER'>;
}

interface CollectPlayerJobData {
  puuid: string;
  region: Region;
  /** Unix epoch seconds — only fetch matches after this timestamp. */
  startTime?: number;
}

// ─── Processor ─────────────────────────────────────────────────────────────

/**
 * Processes jobs from the 'match-collection' queue.
 *
 * Handles two job types:
 *  - `collect-region`:  fetches top-ranked players and enqueues per-player jobs.
 *  - `collect-player-matches`: fetches + saves matches for a single player.
 *
 * Error strategy:
 *  - RiotApiRateLimitException (429): move job to delayed state (NOT a failed attempt).
 *  - RiotApiNotFoundException (404 / 403): return { skipped: true }, no retry.
 *  - All other errors: re-throw → BullMQ exponential-backoff retry.
 */
@Processor(QUEUE_NAMES.MATCH_COLLECTION, {
  concurrency: 5,
  limiter: { max: 15, duration: 1_000 }, // Stay safely under Riot's 20 req/s
})
export class DataCollectorProcessor extends WorkerHost {
  private readonly logger = new Logger(DataCollectorProcessor.name);

  constructor(
    private readonly dataCollectorService: DataCollectorService,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectQueue(QUEUE_NAMES.MATCH_COLLECTION)
    private readonly matchQueue: Queue<CollectPlayerJobData>
  ) {
    super();
  }

  // ── Router ─────────────────────────────────────────────────────────

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_NAMES.COLLECT_REGION:
        return this.handleCollectRegion(job as Job<CollectRegionJobData>);
      case JOB_NAMES.COLLECT_PLAYER:
        return this.handleCollectPlayer(job as Job<CollectPlayerJobData>);
      default:
        throw new Error(`[DataCollectorProcessor] Unknown job name: ${job.name}`);
    }
  }

  // ── collect-region ──────────────────────────────────────────────────

  /**
   * 1. Loads top-ranked players from DB for the given region.
   * 2. Enqueues one `collect-player-matches` job per player with incremental startTime.
   */
  private async handleCollectRegion(job: Job<CollectRegionJobData>): Promise<unknown> {
    const { region } = job.data;
    this.logger.log(`[${region}] Processing collect-region job ${job.id ?? ''}`);

    // Determine the latest match_id timestamp already in DB for this region so we
    // only fetch newer matches (incremental fetch).
    const latestPlayer = await this.playerRepo.findOne({
      where: { region },
      order: { lastFetchAt: 'DESC' },
    });
    const startTime = latestPlayer?.lastFetchAt
      ? Math.floor(latestPlayer.lastFetchAt.getTime() / 1_000) + 1
      : undefined;

    // Load players ordered by least-recently-fetched first (nulls first = never fetched).
    const players = await this.playerRepo.find({
      where: { region },
      order: { lastFetchAt: { direction: 'ASC', nulls: 'FIRST' } },
      take: 100,
    });

    await job.updateProgress(20);

    if (players.length === 0) {
      this.logger.warn(`[${region}] No players in DB — skipping match collection`);
      return { region, enqueued: 0 };
    }

    const jobs = players.map((player) => ({
      name: JOB_NAMES.COLLECT_PLAYER,
      data: {
        puuid: player.puuid,
        region: player.region as Region,
        startTime,
      } satisfies CollectPlayerJobData,
      opts: { priority: 5 },
    }));

    await this.matchQueue.addBulk(jobs);
    await job.updateProgress(100);

    this.logger.log(`[${region}] Enqueued ${jobs.length} collect-player-matches jobs`);
    return { region, enqueued: jobs.length, startTime };
  }

  // ── collect-player-matches ──────────────────────────────────────────

  /**
   * Fetches and saves new matches for a single player.
   * Uses startTime for incremental fetching (matches newer than last fetch).
   */
  private async handleCollectPlayer(job: Job<CollectPlayerJobData>): Promise<unknown> {
    const { puuid, region, startTime } = job.data;
    const shortId = puuid.substring(0, 8);

    try {
      const result = await this.dataCollectorService.collectPlayerMatchesByPuuid(
        puuid,
        region,
        startTime
      );
      this.logger.debug(
        `[${region}] ${shortId}... saved=${result.matchesSaved} skipped=${result.skipped} errors=${result.errors}`
      );
      return result;
    } catch (error) {
      if (error instanceof RiotApiRateLimitException) {
        // Delay, do NOT count as a failed attempt.
        const delayMs = error.retryAfterSeconds * 1_000;
        this.logger.warn(
          `[${region}] 429 for ${shortId}... — delaying job ${job.id ?? ''} by ${delayMs}ms`
        );
        await job.moveToDelayed(Date.now() + delayMs, job.token);
        return; // Must return (not throw) so BullMQ doesn't mark as failed.
      }

      if (error instanceof RiotApiNotFoundException) {
        // 404 or 403 — skip silently, no retry needed.
        this.logger.warn(`[${region}] Resource not found for ${shortId}... — skipping`);
        return { skipped: true, puuid, region };
      }

      // Re-throw for BullMQ exponential backoff retry.
      throw error;
    }
  }

  // ── Worker lifecycle events ─────────────────────────────────────────

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`✅ ${job.name} [${job.id ?? '?'}] completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      `❌ ${job.name} [${job.id ?? '?'}] failed ` +
        `(attempt ${job.attemptsMade}/${job.opts.attempts ?? '?'}): ${err.message}`
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`⚠️  Job ${jobId} stalled and will be retried`);
  }
}

// ─── Region validation helper (used by scheduler) ──────────────────────────

export function isValidRegion(value: string): value is Region {
  return (ALL_REGIONS as string[]).includes(value);
}
