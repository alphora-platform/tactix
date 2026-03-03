import { Injectable, Logger } from '@nestjs/common';
import { PatchNotesParserService, ChangeEntry } from './patch-notes-parser.service';
import { TierClassificationService } from '../analytics/tier-classification.service';
import { TierListEntryDto, Tier } from '../analytics/dto/tier-list.dto';

export interface CompImpactDto {
  compId: string;
  label: string;
  totalImpact: number;
  affectingChanges: ChangeEntry[];
}

export interface PredictionDto {
  patch: string;
  winners: CompImpactDto[];
  losers: CompImpactDto[];
  changes_breakdown: ChangeEntry[];
  generated_at: string;
  confidence: 'low' | 'medium' | 'high';
}

const TIER_WEIGHTS: Record<Tier, number> = {
  S: 2.0,
  A: 1.5,
  B: 1.0,
  C: 0.7,
};

@Injectable()
export class ImpactScoringService {
  private readonly logger = new Logger(ImpactScoringService.name);

  constructor(
    private readonly parserService: PatchNotesParserService,
    private readonly tierClassificationService: TierClassificationService
  ) {}

  scoreChanges(changes: ChangeEntry[], currentMeta: TierListEntryDto[]): CompImpactDto[] {
    const totalGames = currentMeta.reduce((sum, comp) => sum + comp.sample_size, 0);
    if (totalGames === 0) return [];

    const compImpacts = new Map<string, CompImpactDto>();

    for (const comp of currentMeta) {
      compImpacts.set(comp.comp_id, {
        compId: comp.comp_id,
        label: comp.label,
        totalImpact: 0,
        affectingChanges: [],
      });
    }

    for (const change of changes) {
      // Very basic entity matching: if the comp's trait combo includes the entity name
      // In a real app we'd map Set16_Punk back to Punk more robustly, or map Item/Unit names.
      // For now, simple includes.
      const affectedComps = currentMeta.filter(
        (comp) =>
          comp.trait_combo.some((trait) =>
            trait.toLowerCase().includes(change.entityName.toLowerCase())
          ) || comp.label.toLowerCase().includes(change.entityName.toLowerCase())
      );

      for (const comp of affectedComps) {
        let baseScore = 0;
        let numericImpact = false;

        if (change.deltas && change.deltas.length > 0) {
          for (const delta of change.deltas) {
            const before = parseFloat((delta.before || '').replace(/[^0-9.-]/g, ''));
            const after = parseFloat((delta.after || '').replace(/[^0-9.-]/g, ''));

            if (!isNaN(before) && !isNaN(after) && before > 0) {
              const pct = (Math.abs(after - before) / before) * 100;
              baseScore += delta.direction === 'up' ? pct : delta.direction === 'down' ? -pct : 0;
              numericImpact = true;
            } else {
              baseScore +=
                delta.direction === 'up'
                  ? 15
                  : delta.direction === 'down'
                  ? -15
                  : delta.direction === 'neutral'
                  ? 0
                  : 0; // random heuristic adjustments
            }
          }
        }

        if (!numericImpact && change.deltas?.length === 0) {
          baseScore =
            change.changeType === 'buff'
              ? 15
              : change.changeType === 'nerf'
              ? -15
              : change.changeType === 'adjust'
              ? 7
              : 0;
        }

        const compPresenceWeight = comp.sample_size / totalGames;
        // The instruction says comp_presence_weight * meta_tier_weight
        // Wait, the comp presence weight is extremely small (e.g. 50 / 100000 = 0.0005)
        // Let's multiply it by a scaling factor or just keep it relative. The prompt says:
        // impact = base_score × comp_presence_weight × meta_tier_weight
        const tierWeight = TIER_WEIGHTS[comp.tier] || 1.0;
        const normalizedPresence = compPresenceWeight * 100; // Multiply by 100 to make impacts readable (e.g. 5% playrate)

        const impact = baseScore * normalizedPresence * tierWeight;

        if (impact !== 0) {
          const record = compImpacts.get(comp.comp_id)!;
          record.totalImpact += impact;
          if (!record.affectingChanges.includes(change)) {
            record.affectingChanges.push(change);
          }
        }
      }
    }

    return Array.from(compImpacts.values());
  }

  async getPredictions(patch: string): Promise<PredictionDto> {
    this.logger.log(`Generating predictions for patch ${patch}`);

    // 1. Fetch current meta
    // We assume the requested patch is the NEW patch, so we fetch meta for the previous patch.
    // Determining the previous patch programmatically:
    const parts = patch.split('.');
    const prevPatch = `${parts[0]}.${parseInt(parts[1] || '1') - 1}`;

    let metaTiers;
    try {
      const tierListDto = await this.tierClassificationService.getTierList(prevPatch);
      metaTiers = [
        ...tierListDto.tiers.S,
        ...tierListDto.tiers.A,
        ...tierListDto.tiers.B,
        ...tierListDto.tiers.C,
      ];
    } catch (err) {
      this.logger.warn(
        `Could not fetch meta for previous patch ${prevPatch}. Using ${patch} instead.`
      );
      const tierListDto = await this.tierClassificationService.getTierList(patch);
      metaTiers = [
        ...tierListDto.tiers.S,
        ...tierListDto.tiers.A,
        ...tierListDto.tiers.B,
        ...tierListDto.tiers.C,
      ];
    }

    // 2. Fetch patch notes
    const raw = await this.parserService.fetchPatchNotes(patch);
    const changes = this.parserService.parseHtmlToChanges(raw.html);

    // 3. Score changes
    const impacts = this.scoreChanges(changes, metaTiers);

    // Filter out 0 impact comps
    const activeImpacts = impacts.filter((i) => i.totalImpact !== 0);

    // Sort by impact
    activeImpacts.sort((a, b) => b.totalImpact - a.totalImpact);

    const winners = activeImpacts.filter((i) => i.totalImpact > 0).slice(0, 5);
    const losers = activeImpacts
      .filter((i) => i.totalImpact < 0)
      .reverse()
      .slice(0, 5);

    const totalGames = metaTiers.reduce((sum, comp) => sum + comp.sample_size, 0);
    const confidence = totalGames >= 1000 ? 'high' : totalGames >= 200 ? 'medium' : 'low';

    return {
      patch,
      winners,
      losers,
      changes_breakdown: changes,
      generated_at: new Date().toISOString(),
      confidence,
    };
  }
}
