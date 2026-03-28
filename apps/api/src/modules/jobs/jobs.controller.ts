import { Controller, Get, HttpCode, HttpStatus, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../auth/decorators/public.decorator';
import { SYSTEM_QUEUE, SYSTEM_JOB_NAMES } from './jobs.constants';

export interface JobSummary {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: unknown;
  error: string | null;
}

@Public()
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    @InjectQueue(SYSTEM_QUEUE)
    private readonly systemQueue: Queue
  ) {}

  /** Enqueue a purge-match-data background job. */
  @Post('purge-match-data')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueuePurge() {
    const job = await this.systemQueue.add(
      SYSTEM_JOB_NAMES.PURGE_MATCH_DATA,
      { triggeredAt: new Date().toISOString() },
      {
        attempts: 1,
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 20 },
      }
    );
    this.logger.warn(`[Jobs] Enqueued purge-match-data job id=${job.id}`);
    return { jobId: job.id, name: job.name, enqueuedAt: new Date().toISOString() };
  }

  /** List recent system jobs across all states. */
  @Get()
  async listJobs(): Promise<JobSummary[]> {
    const jobs = await this.systemQueue.getJobs(
      ['waiting', 'active', 'completed', 'failed', 'delayed'],
      0,
      50
    );

    const summaries = await Promise.all(jobs.map((j) => this.toSummary(j)));
    // Most recent first
    return summaries.sort((a, b) => new Date(b.enqueuedAt).getTime() - new Date(a.enqueuedAt).getTime());
  }

  /** Get a single job by ID. */
  @Get(':id')
  async getJob(@Param('id') id: string): Promise<JobSummary> {
    const job = await this.systemQueue.getJob(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return this.toSummary(job);
  }

  private async toSummary(job: Awaited<ReturnType<Queue['getJob']>>): Promise<JobSummary> {
    const state = await job!.getState();
    return {
      id: String(job!.id),
      name: job!.name,
      status: state as JobSummary['status'],
      progress: typeof job!.progress === 'number' ? job!.progress : 0,
      enqueuedAt: new Date(job!.timestamp).toISOString(),
      startedAt: job!.processedOn ? new Date(job!.processedOn).toISOString() : null,
      finishedAt: job!.finishedOn ? new Date(job!.finishedOn).toISOString() : null,
      result: job!.returnvalue ?? null,
      error: job!.failedReason ?? null,
    };
  }
}
