import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../data-collector/constants/queue.constants';
import { ViewRefreshService } from '../../database/view-refresh.service';

/**
 * Processes 'refresh-materialized-views' jobs from the 'view-refresh' queue.
 *
 * Jobs are enqueued by CollectorSchedulerService every 30 minutes with priority 3.
 * The processor delegates all DB work to ViewRefreshService.refreshAll() and
 * returns timing metadata so Bull Board can display it.
 *
 * Error strategy:
 *  - On failure, re-throw so BullMQ applies the configured fixed-delay retry.
 */
@Processor(QUEUE_NAMES.VIEW_REFRESH, {
  concurrency: 1, // Only one refresh in flight at a time
})
export class ViewRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(ViewRefreshProcessor.name);

  constructor(private readonly viewRefreshService: ViewRefreshService) {
    super();
  }

  async process(job: Job): Promise<{ durationMs: number }> {
    if (job.name !== JOB_NAMES.REFRESH_VIEWS) {
      throw new Error(`[ViewRefreshProcessor] Unknown job name: ${job.name}`);
    }

    const t0 = Date.now();
    this.logger.log(`[ViewRefresh] Job [${job.id ?? '?'}] started`);

    await this.viewRefreshService.refreshAll();

    return { durationMs: Date.now() - t0 };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: { durationMs: number }): void {
    this.logger.log(
      `✅ refresh-materialized-views [${job.id ?? '?'}] completed in ${result.durationMs} ms`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      `❌ refresh-materialized-views [${job.id ?? '?'}] failed ` +
        `(attempt ${job.attemptsMade}/${job.opts.attempts ?? '?'}): ${err.message}`
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`⚠️  View-refresh job ${jobId} stalled and will be retried`);
  }
}
