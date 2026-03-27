import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RiotMatchDetail } from '../riot-api/interfaces/riot-api.interfaces';
import { EtlService } from './etl.service';
import { QUEUE_NAMES, JOB_NAMES } from './constants/queue.constants';

// ─── Job payload ────────────────────────────────────────────────────────────

export interface EtlProcessMatchJobData {
  /** Raw RiotMatchDetail from the Riot API — passed verbatim from the collector. */
  raw: RiotMatchDetail;
  /** Region where the match was played, e.g. "NA". Stored on the Match row. */
  region?: string;
}

// ─── Processor ──────────────────────────────────────────────────────────────

/**
 * Processes jobs from the 'etl-pipeline' queue.
 *
 * Triggered by `DataCollectorService` after a match is fetched from the Riot API.
 * Delegates all transformation logic to `EtlService.processMatch()`.
 *
 * Queue options (set in module registration):
 *  - concurrency: 5
 *  - attempts: 2
 *  - backoff: fixed, 10 000 ms
 *
 * Error strategy:
 *  - Validation skips (non-ranked, wrong count) are NOT thrown — return value signals skip.
 *  - Transient DB errors are re-thrown so BullMQ applies the fixed-delay retry.
 */
@Processor(QUEUE_NAMES.ETL_PIPELINE, {
  concurrency: 5,
  lockDuration: 60_000,
  lockRenewTime: 30_000,
})
export class EtlProcessor extends WorkerHost {
  private readonly logger = new Logger(EtlProcessor.name);

  constructor(private readonly etlService: EtlService) {
    super();
  }

  // ── Router ────────────────────────────────────────────────────────────────

  async process(job: Job): Promise<unknown> {
    if (job.name !== JOB_NAMES.ETL_PROCESS_MATCH) {
      throw new Error(`[EtlProcessor] Unknown job name: ${job.name}`);
    }

    return this.handleProcessMatch(job as Job<EtlProcessMatchJobData>);
  }

  // ── etl-process-match ─────────────────────────────────────────────────────

  private async handleProcessMatch(job: Job<EtlProcessMatchJobData>): Promise<unknown> {
    const { raw, region } = job.data;
    const matchId = raw?.metadata?.match_id ?? '<unknown>';

    this.logger.debug(`[ETL] Processing match ${matchId} (region=${region ?? '?'})`);

    try {
      const result = await this.etlService.processMatch(raw, region);

      if (result.skipped) {
        this.logger.log(
          `[ETL] Skipped match ${result.matchId ?? matchId}: reason=${result.reason}`
        );
        return { skipped: true, reason: result.reason, matchId: result.matchId };
      }

      return {
        matchId: result.matchId,
        participantsSaved: result.participantsSaved,
      };
    } catch (error) {
      // Re-throw so BullMQ applies fixed-delay retry (configured in module).
      const err = error as Error;
      this.logger.error(`[ETL] Failed to process match ${matchId}: ${err.message}`);
      throw error;
    }
  }

  // ── Worker lifecycle events ───────────────────────────────────────────────

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`✅ etl-process-match [${job.id ?? '?'}] completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      `❌ etl-process-match [${job.id ?? '?'}] failed ` +
        `(attempt ${job.attemptsMade}/${job.opts.attempts ?? '?'}): ${err.message}`
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`⚠️  ETL job ${jobId} stalled and will be retried`);
  }
}
