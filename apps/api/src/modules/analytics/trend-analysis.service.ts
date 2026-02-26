import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TrendDto,
  TrendDirection,
  WindowStatsDto,
  MetaSnapshotDto,
  TimeWindow,
} from './dto/trend.dto';
import { CompDetectionService } from './comp-detection.service';

/** Raw row returned by mv_comp_trend queries. All numerics come back as strings from pg. */
interface MvCompTrendRow {
  comp_id: string;
  patch: string;
  time_bucket: TimeWindow;
  games: string;
  avg_placement: string;
  win_rate: string;
  top4_rate: string;
  prev_win_rate: string | null;
}

/** Raw row when we join mv_comp_trend with the trait_combo from mv_comp_stats. */
interface MvSnapshotRow extends MvCompTrendRow {
  trait_combo: string[];
}

/**
 * Threshold above/below which a comp is classified RISING or FALLING.
 * Delta is expressed in absolute win-rate percentage points.
 */
const TREND_THRESHOLD = 0.03;

/**
 * The "short" window used as the leading indicator in trend comparison.
 * If win_rate(6h) and win_rate(24h) both exist, direction is derived from their delta.
 */
const WINDOW_SHORT: TimeWindow = '6h';
const WINDOW_LONG: TimeWindow = '24h';

@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly compDetection: CompDetectionService
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns the full per-window breakdown and trend direction for a single comp.
   *
   * Algorithm:
   *  - Fetch all mv_comp_trend rows for this (comp_id, patch) pair.
   *  - Compare win_rate at WINDOW_SHORT (6h) vs WINDOW_LONG (24h).
   *  - If Δ > TREND_THRESHOLD  → RISING
   *  - If Δ < -TREND_THRESHOLD → FALLING
   *  - Otherwise               → STABLE
   *
   * Returns an empty windows array (direction STABLE) when the view has no
   * rows for this comp/patch — callers should handle that gracefully.
   */
  async getTrend(compId: string, patch: string): Promise<TrendDto> {
    const rows = await this.dataSource.query<MvCompTrendRow[]>(
      `
      SELECT comp_id, patch, time_bucket, games, avg_placement, win_rate, top4_rate, prev_win_rate
      FROM   mv_comp_trend
      WHERE  comp_id = $1
        AND  patch   = $2
      ORDER BY time_bucket
      `,
      [compId, patch]
    );

    const windows = this.mapWindowRows(rows);
    const direction = this.computeDirection(windows);

    this.logger.debug(
      `getTrend comp_id=${compId} patch=${patch} direction=${direction} windows=${windows.length}`
    );

    return { comp_id: compId, trend_direction: direction, windows };
  }

  /**
   * Returns all comps that appear in mv_comp_trend for a given patch + time
   * window, each annotated with a trend direction derived from the 6h vs 24h
   * delta.
   *
   * The result is sorted by win_rate DESC within the requested window.
   */
  async getMetaSnapshot(patch: string, timeWindow: TimeWindow): Promise<MetaSnapshotDto[]> {
    // Pull data for the requested window AND the 24h window (for trend delta),
    // then join mv_comp_stats to get the trait_combo for labelling.
    const rows = await this.dataSource.query<MvSnapshotRow[]>(
      `
      SELECT
        ct.comp_id,
        ct.patch,
        ct.time_bucket,
        ct.games,
        ct.avg_placement,
        ct.win_rate,
        ct.top4_rate,
        ct.prev_win_rate,
        cs.trait_combo
      FROM mv_comp_trend ct
      LEFT JOIN mv_comp_stats cs
        ON  cs.comp_id = ct.comp_id
        AND cs.patch   = ct.patch
      WHERE ct.patch       = $1
        AND ct.time_bucket IN ($2, $3)
      ORDER BY ct.comp_id, ct.time_bucket
      `,
      [patch, timeWindow, WINDOW_LONG]
    );

    // Group rows by comp_id so we can compute direction per comp.
    const byComp = this.groupByCompId(rows);

    const result: MetaSnapshotDto[] = [];

    for (const [compId, compRows] of byComp) {
      // Find the row matching the requested window for primary stats.
      const primary = compRows.find((r) => r.time_bucket === timeWindow);
      if (!primary) continue;

      const windows = this.mapWindowRows(compRows);
      const direction = this.computeDirection(windows);
      const traitCombo: string[] = primary.trait_combo ?? [];

      result.push({
        comp_id: compId,
        label: this.compDetection.getCompLabel(traitCombo),
        win_rate: parseFloat(primary.win_rate),
        top4_rate: parseFloat(primary.top4_rate),
        avg_placement: parseFloat(primary.avg_placement),
        games: parseInt(primary.games, 10),
        trend_direction: direction,
      });
    }

    // Sort by win_rate DESC within the chosen time window.
    result.sort((a, b) => b.win_rate - a.win_rate);

    this.logger.debug(`getMetaSnapshot patch=${patch} window=${timeWindow} comps=${result.length}`);

    return result;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private mapWindowRows(rows: MvCompTrendRow[]): WindowStatsDto[] {
    return rows.map((r) => ({
      bucket: r.time_bucket,
      win_rate: parseFloat(r.win_rate),
      top4_rate: parseFloat(r.top4_rate),
      avg_placement: parseFloat(r.avg_placement),
      games: parseInt(r.games, 10),
    }));
  }

  /**
   * Derives trend direction from a set of WindowStatsDtos.
   *
   * Requires both WINDOW_SHORT (6h) and WINDOW_LONG (24h) to be present.
   * Falls back to STABLE when either window is missing — e.g. a very new comp
   * that hasn't accumulated 10 games in the 24h bucket yet.
   */
  private computeDirection(windows: WindowStatsDto[]): TrendDirection {
    const short = windows.find((w) => w.bucket === WINDOW_SHORT);
    const long = windows.find((w) => w.bucket === WINDOW_LONG);

    if (!short || !long) return 'STABLE';

    const delta = short.win_rate - long.win_rate;

    if (delta > TREND_THRESHOLD) return 'RISING';
    if (delta < -TREND_THRESHOLD) return 'FALLING';
    return 'STABLE';
  }

  private groupByCompId(rows: MvSnapshotRow[]): Map<string, MvSnapshotRow[]> {
    const map = new Map<string, MvSnapshotRow[]>();
    for (const row of rows) {
      const existing = map.get(row.comp_id) ?? [];
      existing.push(row);
      map.set(row.comp_id, existing);
    }
    return map;
  }
}
