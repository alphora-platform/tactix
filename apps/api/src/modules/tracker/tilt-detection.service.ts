import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TiltReportDto } from './dto/tracker-advanced.dto';

// ── Raw query row ──────────────────────────────────────────────────────────

interface GameRow {
  match_id: string;
  placement: string;
  /** Hour (0–23 UTC) when the game started. */
  game_hour: string;
}

/** Sliding window size for the rolling average. */
const WINDOW = 5;
/** Placement degradation threshold to declare tilt. */
const TILT_THRESHOLD = 1.5;
/** UTC hour that separates "early" from "late night". */
const LATE_NIGHT_HOUR = 23;

@Injectable()
export class TiltDetectionService {
  private readonly logger = new Logger(TiltDetectionService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Analyses the last `lastN` ranked games of a player to detect performance
   * degradation ("tilting") over the session.
   *
   * Algorithm:
   *   1. Fetch last N games sorted ASC (oldest first).
   *   2. Compute a rolling WINDOW-game average placement for each position.
   *   3. Compare avg of games 1–5 vs avg of games 15–20 (relative to lastN).
   *   4. Tilt: sliding_avg[late] > sliding_avg[early] + TILT_THRESHOLD.
   *   5. Late-night degradation: avg placement after 23:00 UTC vs before.
   *
   * @param puuid  Player Riot PUUID
   * @param lastN  Number of recent games to analyse (default 20).
   */
  async detectTilt(puuid: string, lastN = 20): Promise<TiltReportDto> {
    this.logger.debug(`detectTilt puuid=${puuid} lastN=${lastN}`);

    const rows = await this.dataSource.query<GameRow[]>(
      `
      SELECT
        p.match_id,
        p.placement::text,
        EXTRACT(HOUR FROM m.game_datetime)::text AS game_hour
      FROM participants p
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      WHERE p.puuid = $1
      ORDER BY m.game_datetime DESC
      LIMIT $2
      `,
      [puuid, lastN]
    );

    // Reverse so index 0 = oldest game (ASC order for analysis).
    const games = rows.reverse();

    if (games.length === 0) {
      return {
        tilt_detected: false,
        avg_early: 0,
        avg_late: 0,
        late_night_degradation: 0,
        sliding_avgs: [],
      };
    }

    const placements = games.map((g) => parseInt(g.placement, 10));

    // ── Rolling averages ────────────────────────────────────────────────
    const slidingAvgs = this.computeSlidingAvgs(placements, WINDOW);

    // "Early" = avg of first WINDOW games; "late" = avg of last WINDOW games.
    const earlySlice = placements.slice(0, WINDOW);
    const lateSlice = placements.slice(Math.max(0, placements.length - WINDOW));
    const avgEarly = earlySlice.reduce((s, v) => s + v, 0) / (earlySlice.length || 1);
    const avgLate = lateSlice.reduce((s, v) => s + v, 0) / (lateSlice.length || 1);

    // ── Tilt detection ──────────────────────────────────────────────────
    const tiltDetected = placements.length >= 10 && avgLate > avgEarly + TILT_THRESHOLD;

    // Find approximate tilt start — first window whose avg exceeds earlyAvg + threshold.
    let tiltStartGame: number | undefined;
    if (tiltDetected) {
      for (let i = WINDOW; i < slidingAvgs.length; i++) {
        if ((slidingAvgs[i] ?? 0) > avgEarly + TILT_THRESHOLD) {
          tiltStartGame = i;
          break;
        }
      }
    }

    // ── Late-night degradation ──────────────────────────────────────────
    const beforeLate = games.filter((g) => parseInt(g.game_hour, 10) < LATE_NIGHT_HOUR);
    const afterLate = games.filter((g) => parseInt(g.game_hour, 10) >= LATE_NIGHT_HOUR);

    const avgBefore = beforeLate.length
      ? beforeLate.reduce((s, g) => s + parseInt(g.placement, 10), 0) / beforeLate.length
      : 0;
    const avgAfter = afterLate.length
      ? afterLate.reduce((s, g) => s + parseInt(g.placement, 10), 0) / afterLate.length
      : 0;

    const lateNightDegradation =
      beforeLate.length > 0 && afterLate.length > 0
        ? Math.round((avgAfter - avgBefore) * 100) / 100
        : 0;

    return {
      tilt_detected: tiltDetected,
      tilt_start_game: tiltStartGame,
      avg_early: Math.round(avgEarly * 100) / 100,
      avg_late: Math.round(avgLate * 100) / 100,
      late_night_degradation: lateNightDegradation,
      sliding_avgs: slidingAvgs.map((v) => Math.round(v * 100) / 100),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Computes a rolling average of `window` elements.
   * Each element i in the result is the avg of placements[i-window+1 .. i].
   * Indices 0 .. window-2 are padded with the simple cumulative average.
   */
  private computeSlidingAvgs(placements: number[], window: number): number[] {
    const result: number[] = [];
    let sum = 0;

    for (let i = 0; i < placements.length; i++) {
      sum += placements[i]!;

      if (i < window) {
        result.push(sum / (i + 1));
      } else {
        sum -= placements[i - window]!;
        result.push(sum / window);
      }
    }

    return result;
  }
}
