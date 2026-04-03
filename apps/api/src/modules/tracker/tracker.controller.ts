import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { TrackerQueryDto } from './dto/tracker-query.dto';
import { EconQueryDto } from './dto/econ-query.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * TrackerController
 *
 * Exposes personal performance endpoints under /tracker/:puuid.
 * All work is delegated to TrackerService — this controller only handles
 * HTTP concerns (routing, param extraction, logging).
 *
 * Endpoints (phase 1):
 *   GET /tracker/:puuid/placements?patch=   → placement distribution + breakdowns
 *   GET /tracker/:puuid/recent?limit=       → recent ranked games with comp labels
 *   GET /tracker/:puuid/proficiency?patch=  → comp proficiency vs. meta average
 *
 * Endpoints (phase 2):
 *   GET /tracker/:puuid/econ?compId=&patch= → gold-left econ curve per level bucket
 *   GET /tracker/:puuid/items?patch=        → item efficiency vs. meta win rate
 *   GET /tracker/:puuid/tilt               → tilt detection across last 20 games
 *   GET /tracker/:puuid/report/weekly      → weekly weakness report (top 3 gaps)
 */
@Public()
@Controller('tracker')
export class TrackerController {
  private readonly logger = new Logger(TrackerController.name);

  constructor(private readonly tracker: TrackerService) {}

  // ── Phase 1 endpoints ─────────────────────────────────────────────────

  /**
   * GET /tracker/:puuid/placements
   *
   * Returns the player's placement distribution (histogram + overall, by-comp,
   * by-day-of-week, and by-hour-of-day breakdowns).
   *
   * Query params:
   *   - patch (optional) — e.g. "14.3". When omitted, all patches are included.
   */
  @Get(':puuid/placements')
  getPlacementDistribution(@Param('puuid') puuid: string, @Query() query: TrackerQueryDto) {
    this.logger.log(`GET /tracker/${puuid}/placements patch=${query.patch ?? 'all'}`);
    return this.tracker.getPlacementDistribution(puuid, query.patch);
  }

  /**
   * GET /tracker/:puuid/recent
   *
   * Returns the N most-recent ranked games for this player, each annotated
   * with the detected comp (comp_id + label) and all key game stats.
   *
   * Query params:
   *   - limit (optional, 1–100, default 20)
   */
  @Get(':puuid/recent')
  getRecentGames(@Param('puuid') puuid: string, @Query() query: TrackerQueryDto) {
    const limit = query.limit ?? 20;
    this.logger.log(`GET /tracker/${puuid}/recent limit=${limit}`);
    return this.tracker.getRecentGames(puuid, limit);
  }

  /**
   * GET /tracker/:puuid/proficiency
   *
   * Returns comp proficiency scores — each comp the player has played ≥ 5 times,
   * compared against the global meta average from mv_comp_stats.
   *
   * Query params:
   *   - patch (optional) — e.g. "14.3". When omitted, all patches are included.
   */
  @Get(':puuid/proficiency')
  getCompProficiency(@Param('puuid') puuid: string, @Query() query: TrackerQueryDto) {
    this.logger.log(`GET /tracker/${puuid}/proficiency patch=${query.patch ?? 'all'}`);
    return this.tracker.getCompProficiency(puuid, query.patch);
  }

  // ── Phase 2 endpoints ─────────────────────────────────────────────────

  /**
   * GET /tracker/:puuid/econ
   *
   * Returns avg gold_left per level bucket (early/mid/late) for the player
   * on a given comp, vs. the meta benchmark (top-4 finishers on same comp).
   *
   * Query params:
   *   - compId (optional) — 16-char MD5 comp fingerprint. Omit to aggregate
   *                          across all comps the player has played.
   *   - patch  (optional) — e.g. "14.3". Omit to include all patches.
   */
  @Get(':puuid/econ')
  getEconCurve(@Param('puuid') puuid: string, @Query() query: EconQueryDto) {
    this.logger.log(
      `GET /tracker/${puuid}/econ compId=${query.compId ?? 'all'} patch=${query.patch ?? 'all'}`
    );
    return this.tracker.getEconCurve(puuid, query.compId, query.patch);
  }

  /**
   * GET /tracker/:puuid/items
   *
   * Returns item efficiency data — for each (character, items[]) combo the
   * player has built ≥ 3 times, shows win rate vs. meta and the efficiency delta.
   * Sorted by |efficiency_delta| DESC.
   *
   * Query params:
   *   - patch (optional) — e.g. "14.3". Omit to include all patches.
   */
  @Get(':puuid/items')
  getItemEfficiency(@Param('puuid') puuid: string, @Query() query: TrackerQueryDto) {
    this.logger.log(`GET /tracker/${puuid}/items patch=${query.patch ?? 'all'}`);
    return this.tracker.getItemEfficiency(puuid, query.patch);
  }

  /**
   * GET /tracker/:puuid/tilt
   *
   * Analyses the last 20 ranked games for session-level performance degradation.
   * Returns tilt_detected flag, early/late avg placements, tilt_start_game index,
   * late-night degradation, and the full sliding-avg series.
   */
  @Get(':puuid/tilt')
  detectTilt(@Param('puuid') puuid: string) {
    this.logger.log(`GET /tracker/${puuid}/tilt`);
    return this.tracker.detectTilt(puuid);
  }

  /**
   * GET /tracker/:puuid/report/weekly
   *
   * Generates a curated weakness report for the last 7 days.
   * Aggregates worst comps, item gaps, and tilt patterns into up to 9 concise
   * weakness cards, each with a human-readable description and suggestion.
   */
  @Get(':puuid/report/weekly')
  generateWeeklyReport(@Param('puuid') puuid: string) {
    this.logger.log(`GET /tracker/${puuid}/report/weekly`);
    return this.tracker.generateWeeklyReport(puuid);
  }
}
