import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../../database/entities';
import { Region, ALL_REGIONS } from '../riot-api/constants/regions.constants';
import { RiotApiService } from '../riot-api/riot-api.service';
import {
  RiotApiRateLimitException,
  RiotApiNotFoundException,
} from '../riot-api/exceptions/riot-api.exceptions';
import { DataCollectorService } from './data-collector.service';
import { JOB_NAMES, QUEUE_NAMES } from './constants/queue.constants';
import { EtlProcessMatchJobData } from './etl.processor';

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
 * Two-stage pipeline:
 *
 *  Stage 1 — `collect-region`
 *    Loads top-ranked players from DB and enqueues one per-player job.
 *
 *  Stage 2 — `collect-player-matches`
 *    For each player:
 *      1. Fetches new match IDs from Riot API.
 *      2. Filters out IDs already in the DB.
 *      3. Fetches **raw** RiotMatchDetail for each new ID.
 *      4. Enqueues one `etl-process-match` job per match (passing raw JSON).
 *      5. Stamps `lastFetchAt` on the player row.
 *
 *    The actual transformation + DB write is handled by `EtlProcessor`.
 *
 * Error strategy:
 *  - RiotApiRateLimitException (429): move job to delayed state — NOT a failed attempt.
 *  - RiotApiNotFoundException (404/403): skip silently, no retry.
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
    private readonly riotApi: RiotApiService,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectQueue(QUEUE_NAMES.MATCH_COLLECTION)
    private readonly matchQueue: Queue<CollectPlayerJobData>,
    @InjectQueue(QUEUE_NAMES.ETL_PIPELINE)
    private readonly etlQueue: Queue<EtlProcessMatchJobData>
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
   * Two-stage pipeline for a single player:
   *  1. Fetch new match IDs from Riot API (incremental via startTime).
   *  2. Filter IDs that are already in the DB.
   *  3. Fetch raw RiotMatchDetail for each new match ID.
   *  4. Enqueue one `etl-process-match` job per match with the raw JSON.
   *  5. Stamp `lastFetchAt` on the player.
   */
  private async handleCollectPlayer(job: Job<CollectPlayerJobData>): Promise<unknown> {
    const { puuid, region, startTime } = job.data;
    const shortId = puuid.substring(0, 8);

    try {
      // ── 1. Fetch match IDs ────────────────────────────────────────
      const matchIds = await this.riotApi.getMatchIdsByPuuid(region, puuid, 20, startTime);

      if (matchIds.length === 0) {
        await this.dataCollectorService.updatePlayerLastFetchAt(puuid);
        this.logger.debug(`[${region}] ${shortId}... — no new match IDs`);
        return { puuid, region, fetched: 0, enqueued: 0 };
      }

      await job.updateProgress(20);

      // ── 2. Filter already-stored matches ──────────────────────────
      const newMatchIds = await this.dataCollectorService.filterNewMatchIds(matchIds);

      this.logger.debug(
        `[${region}] ${shortId}...: ${matchIds.length} IDs fetched, ${newMatchIds.length} new`
      );

      if (newMatchIds.length === 0) {
        await this.dataCollectorService.updatePlayerLastFetchAt(puuid);
        return { puuid, region, fetched: matchIds.length, enqueued: 0 };
      }

      // ── 3 + 4. Fetch raw JSON → enqueue ETL job per match ─────────
      const etlJobs: { name: string; data: EtlProcessMatchJobData }[] = [];

      for (const matchId of newMatchIds) {
        try {
          const raw = await this.riotApi.getMatchDetail(region, matchId);
          etlJobs.push({
            name: JOB_NAMES.ETL_PROCESS_MATCH,
            data: { raw, region } satisfies EtlProcessMatchJobData,
          });
        } catch (error) {
          if (error instanceof RiotApiNotFoundException) {
            this.logger.warn(`[${region}] Match ${matchId} not found — skipping`);
            continue;
          }
          // Re-throw rate limit errors so the job-level handler below catches them.
          throw error;
        }
      }

      if (etlJobs.length > 0) {
        await this.etlQueue.addBulk(etlJobs);
      }

      await job.updateProgress(90);

      // ── 5. Stamp lastFetchAt ───────────────────────────────────────
      await this.dataCollectorService.updatePlayerLastFetchAt(puuid);

      await job.updateProgress(100);

      this.logger.log(
        `[${region}] ${shortId}...: enqueued ${etlJobs.length} ETL jobs ` +
          `(${newMatchIds.length - etlJobs.length} skipped)`
      );

      return { puuid, region, fetched: matchIds.length, enqueued: etlJobs.length };
    } catch (error) {
      if (error instanceof RiotApiRateLimitException) {
        // Delay — do NOT count as a failed attempt.
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
