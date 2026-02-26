// ── Econ Curve ──────────────────────────────────────────────────────────────

export type LevelBucket = 'early' | 'mid' | 'late';

export class EconLevelDto {
  /** 'early' (≤5), 'mid' (6–7), 'late' (8–9) */
  level_bucket!: LevelBucket;
  player_avg_gold!: number;
  /** Average gold_left among top-50th-percentile players on same comp. */
  meta_avg_gold!: number;
  /** player_avg_gold − meta_avg_gold (+ve = player hoards more gold). */
  delta!: number;
  /** Number of player games in this bucket. */
  player_games!: number;
  meta_games!: number;
}

export class EconCurveDto {
  comp_id!: string;
  patch?: string;
  levels!: EconLevelDto[];
}

// ── Item Efficiency ─────────────────────────────────────────────────────────

export class ItemEfficiencyDto {
  character_id!: string;
  /** Canonical sorted string of item IDs, e.g. "BFSword,ChainVest,Deathblade" */
  items!: string[];
  player_win_rate!: number;
  player_top4_rate!: number;
  player_games!: number;
  meta_win_rate!: number;
  meta_games!: number;
  /** player_win_rate − meta_win_rate. Negative = underperforming. */
  efficiency_delta!: number;
}

// ── Tilt Detection ──────────────────────────────────────────────────────────

export class TiltReportDto {
  tilt_detected!: boolean;
  /** Index (0-based, among the lastN games sorted ASC) where tilt began. */
  tilt_start_game?: number;
  /** Average placement in games 1–5 (earliest). */
  avg_early!: number;
  /** Average placement in games 15–20 (most-recent). */
  avg_late!: number;
  /**
   * Difference in avg placement after 23:00 UTC vs before 23:00 UTC.
   * Positive = worse performance at night.
   */
  late_night_degradation!: number;
  /** Rolling 5-game placements snapshot (one entry per game in the window). */
  sliding_avgs!: number[];
}

// ── Weekly Weakness Report ──────────────────────────────────────────────────

export type WeaknessType = 'worst_comp' | 'item_gap' | 'tilt_pattern';

export class WeaknessDto {
  type!: WeaknessType;
  description!: string;
  suggestion!: string;
}

export class WeaknessReportDto {
  generated_at!: string; // ISO-8601
  period_days!: number;
  games_analysed!: number;
  weaknesses!: WeaknessDto[];
}
