import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DbAdminService } from '../settings/db-admin.service';
import { SYSTEM_QUEUE, SYSTEM_JOB_NAMES } from './jobs.constants';

@Processor(SYSTEM_QUEUE, { concurrency: 1 })
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(private readonly dbAdmin: DbAdminService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`[JobsProcessor] Processing job "${job.name}" (id=${job.id})`);

    if (job.name === SYSTEM_JOB_NAMES.PURGE_MATCH_DATA) {
      return this.dbAdmin.purgeMatchData(job);
    }

    throw new Error(`Unknown job type: ${job.name}`);
  }
}
