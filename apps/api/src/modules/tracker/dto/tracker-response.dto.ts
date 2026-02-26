// ── Placement distribution ─────────────────────────────────────────────────

/** Stats for a single placement bucket (e.g. one specific placement 1–8). */
export class PlacementBucketDto {
  /** Placement value: 1–8. */
  placement!: number;
  /** Number of games that ended at this placement. */
  count!: number;
  /** Fraction of total games, 0–1. */
  frequency!: number;
}

/** Raw stats sub-object reused across several breakdown groups. */
export class GroupStatsDto {
  avg_placement!: number;
  top4_rate!: number;
  win_rate!: number;
  games!: number;
}

/** Performance breakdown for a single comp. */
export class CompBreakdownDto extends GroupStatsDto {
  comp_id!: string;
  label!: string;
}

/** Performance breakdown for a single day-of-week (0=Sunday … 6=Saturday). */
export class DayOfWeekBreakdownDto extends GroupStatsDto {
  /** 0 = Sunday, 6 = Saturday (PostgreSQL EXTRACT(DOW …) convention). */
  day_of_week!: number;
  day_name!: string;
}

/** Performance breakdown for a single hour-of-day (0–23 UTC). */
export class HourOfDayBreakdownDto extends GroupStatsDto {
  /** 0–23 UTC hour. */
  hour_of_day!: number;
}

/** Full placement-distribution response for a single player. */
export class PlacementDistributionDto {
  /** Raw placement histogram (1–8). */
  distribution!: PlacementBucketDto[];
  /** Overall aggregate stats across all games in scope. */
  overall!: GroupStatsDto;
  /** Top-5 most-played comps + their stats. */
  by_comp!: CompBreakdownDto[];
  /** Stats grouped by day-of-week (UTC). */
  by_day_of_week!: DayOfWeekBreakdownDto[];
  /** Stats grouped by hour-of-day (UTC). */
  by_hour_of_day!: HourOfDayBreakdownDto[];
}

// ── Recent games ───────────────────────────────────────────────────────────

export class RecentGameDto {
  match_id!: string;
  game_datetime!: Date;
  placement!: number;
  comp_id!: string;
  comp_label!: string;
  /** Game length in seconds. */
  game_length!: number;
}

// ── Comp proficiency ───────────────────────────────────────────────────────

export class CompProficiencyDto {
  comp_id!: string;
  label!: string;
  games_played!: number;
  player_avg_placement!: number;
  meta_avg_placement!: number;
  /**
   * Positive = player performs better than average on this comp.
   * Formula: (meta_avg - player_avg) / meta_avg × 100
   */
  proficiency_score!: number;
  win_rate!: number;
  top4_rate!: number;
}
