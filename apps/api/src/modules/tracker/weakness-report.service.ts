import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompProficiencyService } from './comp-proficiency.service';
import { ItemEfficiencyService } from './item-efficiency.service';
import { TiltDetectionService } from './tilt-detection.service';
import type { WeaknessDto, WeaknessReportDto } from './dto/tracker-advanced.dto';

/** Days of data included in the weekly report. */
const REPORT_DAYS = 7;

/** Proficiency score below which a comp is flagged as a weakness. */
const WEAK_COMP_THRESHOLD = -10;

/** Item efficiency delta below which an item combo is flagged. */
const WEAK_ITEM_THRESHOLD = -0.05;

/** Maximum number of weaknesses reported per type. */
const MAX_PER_TYPE = 3;

// ── Raw query row for games-in-period count ────────────────────────────────

interface GameCountRow {
  total: string;
}

@Injectable()
export class WeaknessReportService {
  private readonly logger = new Logger(WeaknessReportService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compProficiency: CompProficiencyService,
    private readonly itemEfficiency: ItemEfficiencyService,
    private readonly tiltDetection: TiltDetectionService
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Generates a concise weakness report for the last 7 days.
   *
   * Sources (all run in parallel):
   *   1. CompProficiencyService — comps with proficiency_score < WEAK_COMP_THRESHOLD
   *   2. ItemEfficiencyService  — item combos with efficiency_delta < WEAK_ITEM_THRESHOLD
   *   3. TiltDetectionService   — tilt flag across the period
   *
   * Returns the top-3 weaknesses, in the order: worst comps → item gaps → tilt.
   * Each weakness carries a human-readable description and a concrete suggestion.
   */
  async generateWeeklyReport(puuid: string): Promise<WeaknessReportDto> {
    this.logger.debug(`generateWeeklyReport puuid=${puuid}`);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - REPORT_DAYS);
    const sinceIso = since.toISOString();

    // ── 1. Recent game count (for metadata) ──────────────────────────────
    const countRows = await this.dataSource.query<GameCountRow[]>(
      `
      SELECT COUNT(DISTINCT p.match_id)::text AS total
      FROM participants p
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      WHERE p.puuid = $1
        AND m.game_datetime >= $2::timestamptz
      `,
      [puuid, sinceIso]
    );
    const gamesAnalysed = parseInt(countRows[0]?.total ?? '0', 10);

    // ── 2. Run all three analyses in parallel ─────────────────────────────
    // We pass no patch filter so we always look at the full recent period.
    const [proficiencyResults, itemResults, tiltReport] = await Promise.all([
      this.compProficiency.getCompProficiency(puuid),
      this.itemEfficiency.getItemEfficiency(puuid),
      this.tiltDetection.detectTilt(puuid, 20),
    ]);

    const weaknesses: WeaknessDto[] = [];

    // ── 3a. Worst comps ───────────────────────────────────────────────────
    const worstComps = proficiencyResults
      .filter((c) => c.proficiency_score < WEAK_COMP_THRESHOLD)
      .slice(0, MAX_PER_TYPE);

    for (const comp of worstComps) {
      const score = comp.proficiency_score.toFixed(1);
      const avgVsMeta = (comp.player_avg_placement - comp.meta_avg_placement).toFixed(2);
      weaknesses.push({
        type: 'worst_comp',
        description:
          `${comp.label}: placement avg ${comp.player_avg_placement.toFixed(2)} ` +
          `vs meta avg ${comp.meta_avg_placement.toFixed(2)} ` +
          `(proficiency ${score}%, ${avgVsMeta} placement worse than average).`,
        suggestion:
          `Review ${comp.label} positioning and item transitions. ` +
          `Consider your stage-5 pivot decision — you may be committing too late or too early.`,
      });
    }

    // ── 3b. Item gaps ─────────────────────────────────────────────────────
    const itemGaps = itemResults
      .filter((it) => it.efficiency_delta < WEAK_ITEM_THRESHOLD)
      .slice(0, MAX_PER_TYPE);

    for (const item of itemGaps) {
      const deltaStr = (item.efficiency_delta * 100).toFixed(1);
      weaknesses.push({
        type: 'item_gap',
        description:
          `${item.character_id} with [${item.items.join(', ')}]: ` +
          `your win rate ${(item.player_win_rate * 100).toFixed(1)}% vs meta ` +
          `${(item.meta_win_rate * 100).toFixed(1)}% (${deltaStr}% gap, ` +
          `${item.player_games} games).`,
        suggestion:
          `Check if [${item.items.join(', ')}] is the optimal build for ${item.character_id}. ` +
          `Meta players may prefer different items or use this unit at a higher star level.`,
      });
    }

    // ── 3c. Tilt pattern ─────────────────────────────────────────────────
    if (tiltReport.tilt_detected) {
      const degradation = (tiltReport.avg_late - tiltReport.avg_early).toFixed(2);
      weaknesses.push({
        type: 'tilt_pattern',
        description:
          `Placement degrades over multi-game sessions: avg placement ` +
          `${tiltReport.avg_early.toFixed(2)} early → ` +
          `${tiltReport.avg_late.toFixed(2)} late (+${degradation} avg placement).` +
          (tiltReport.late_night_degradation > 0.5
            ? ` Also noticeable late-night degradation (+${tiltReport.late_night_degradation.toFixed(
                2
              )} after 23:00 UTC).`
            : ''),
        suggestion:
          `Consider taking a break after 3–4 consecutive losses. ` +
          `Track your emotional state — forced play after a bad run typically ` +
          `compounds mistakes in econ and levelling decisions.`,
      });
    }

    // ── 4. Cap total weaknesses at MAX_PER_TYPE × 3 types ────────────────
    return {
      generated_at: new Date().toISOString(),
      period_days: REPORT_DAYS,
      games_analysed: gamesAnalysed,
      weaknesses: weaknesses.slice(0, MAX_PER_TYPE * 3),
    };
  }
}
