import { Injectable } from '@nestjs/common';
import { ImpactScoringService } from './impact-scoring.service';
import { AccuracyTrackingService } from './accuracy-tracking.service';
import { PatchNotesParserService } from './patch-notes-parser.service';

@Injectable()
export class PatchAnalyzerService {
  constructor(
    private readonly impactScoring: ImpactScoringService,
    private readonly accuracyTracking: AccuracyTrackingService,
    private readonly parserService: PatchNotesParserService
  ) {}

  async getPredictions(patch: string) {
    // Scaffold
    return this.impactScoring.getPredictions(patch);
  }

  async getHistoricalAccuracy() {
    return this.accuracyTracking.getHistoricalAccuracy();
  }

  async getChangeBreakdown(patch: string) {
    const raw = await this.parserService.fetchPatchNotes(patch);
    return this.parserService.parseDelta(raw.html);
  }
}
