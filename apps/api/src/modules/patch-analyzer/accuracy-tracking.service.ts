import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PatchPrediction } from '../../database/entities';
import { PredictionDto } from './impact-scoring.service';
import { TierClassificationService } from '../analytics/tier-classification.service';

@Injectable()
export class AccuracyTrackingService {
  private readonly logger = new Logger(AccuracyTrackingService.name);

  constructor(
    @InjectRepository(PatchPrediction)
    private readonly repo: Repository<PatchPrediction>,
    private readonly tierClassificationService: TierClassificationService
  ) {}

  async recordPrediction(prediction: PredictionDto): Promise<void> {
    const { patch, winners, losers } = prediction;
    this.logger.log(
      `Recording ${winners.length} winners and ${losers.length} losers for patch ${patch}`
    );

    // Try to get previous patch meta for actual_winrate_before
    const parts = patch.split('.');
    const prevPatch = `${parts[0]}.${parseInt(parts[1] || '1') - 1}`;
    let prevMetaMap = new Map<string, number>();

    try {
      const prevTierList = await this.tierClassificationService.getTierList(prevPatch);
      for (const tier of Object.values(prevTierList.tiers)) {
        for (const comp of tier) {
          prevMetaMap.set(comp.comp_id, comp.win_rate);
        }
      }
    } catch (e) {
      this.logger.warn(
        `Could not load previous patch ${prevPatch} meta for comparison. Using 0 for before_winrate.`
      );
    }

    const savedEntities: PatchPrediction[] = [];

    // Save winners
    for (const compImpact of winners) {
      const entity = this.repo.create({
        patch,
        compId: compImpact.compId,
        predictedDirection: 'up',
        predictedScore: compImpact.totalImpact,
        actualWinrateBefore: prevMetaMap.get(compImpact.compId) || null,
      });
      savedEntities.push(entity);
    }

    // Save losers
    for (const compImpact of losers) {
      const entity = this.repo.create({
        patch,
        compId: compImpact.compId,
        predictedDirection: 'down',
        predictedScore: compImpact.totalImpact,
        actualWinrateBefore: prevMetaMap.get(compImpact.compId) || null,
      });
      savedEntities.push(entity);
    }

    if (savedEntities.length > 0) {
      await this.repo.save(savedEntities);
    }
  }

  async evaluatePrediction(patch: string): Promise<void> {
    this.logger.log(`Evaluating predictions for patch ${patch}`);

    // Get all unevaluated predictions for this patch
    const predictions = await this.repo.find({ where: { patch, accuracyScore: IsNull() } });
    if (predictions.length === 0) {
      return;
    }

    // Load actual winrates from the current patch
    let currentMetaMap = new Map<string, number>();
    try {
      const currentTierList = await this.tierClassificationService.getTierList(patch);
      for (const tier of Object.values(currentTierList.tiers)) {
        for (const comp of tier) {
          currentMetaMap.set(comp.comp_id, comp.win_rate);
        }
      }
    } catch (e) {
      this.logger.warn(`Could not load current patch ${patch} meta for evaluation.`);
      return;
    }

    for (const pred of predictions) {
      const actualAfter = currentMetaMap.get(pred.compId);
      if (actualAfter === undefined) {
        // Comp not played enough in new patch. Maybe mark accuracy as 0 or ignore?
        pred.accuracyScore = 0;
        pred.evaluatedAt = new Date();
        continue;
      }

      pred.actualWinrateAfter = actualAfter;
      if (pred.actualWinrateBefore !== null) {
        const actualDelta = pred.actualWinrateAfter - pred.actualWinrateBefore;
        const actualDirection = actualDelta > 0 ? 'up' : actualDelta < 0 ? 'down' : 'neutral';

        pred.accuracyScore = pred.predictedDirection === actualDirection ? 1 : 0;
      } else {
        pred.accuracyScore = 0; // Couldn't confirm
      }
      pred.evaluatedAt = new Date();
    }

    await this.repo.save(predictions);
  }

  async getHistoricalAccuracy(): Promise<any> {
    const records = await this.repo.find({ where: {} });
    const evaluated = records.filter((r) => r.accuracyScore !== null);

    if (evaluated.length === 0) {
      return { total_predictions: 0, overall_accuracy: 0, patches: {} };
    }

    const correct = evaluated.filter((r) => r.accuracyScore === 1).length;

    // Group by patch
    const byPatch: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const r of evaluated) {
      if (!byPatch[r.patch]) byPatch[r.patch] = { total: 0, correct: 0, accuracy: 0 };
      byPatch[r.patch].total++;
      if (r.accuracyScore === 1) byPatch[r.patch].correct++;
    }

    for (const p in byPatch) {
      byPatch[p].accuracy = Math.round((byPatch[p].correct / byPatch[p].total) * 100);
    }

    return {
      total_predictions: evaluated.length,
      overall_accuracy: Math.round((correct / evaluated.length) * 100),
      patches: byPatch,
    };
  }
}
