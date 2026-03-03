import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImpactScoringService } from './impact-scoring.service';
import { AccuracyTrackingService } from './accuracy-tracking.service';

@Processor('patch-analysis', {
  concurrency: 1,
})
export class PatchAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(PatchAnalysisProcessor.name);

  constructor(
    private readonly impactScoring: ImpactScoringService,
    private readonly accuracyTracking: AccuracyTrackingService
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'analyze-patch':
        return this.analyzePatch(job);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private async analyzePatch(job: Job) {
    const { patch } = job.data;
    this.logger.log(`Starting patch analysis for ${patch}...`);

    // 1. Get predictions (which fetches notes & scores changes)
    const predictions = await this.impactScoring.getPredictions(patch);

    // 2. Record predictions
    await this.accuracyTracking.recordPrediction(predictions);

    // 3. Fake discord alert logic for phase 3
    this.logger.log(`Prediction recorded. Simulating Discord alert...`);

    return predictions;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ ${job.name} [${job.id}] done`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `❌ ${job.name} [${job.id}] failed (${job.attemptsMade}/${job.opts.attempts}): ${err.message}`
    );
  }
}
