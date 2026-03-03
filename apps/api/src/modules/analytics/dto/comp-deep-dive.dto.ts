// ── Best Items ─────────────────────────────────────────────────────────────

export class ItemComboDto {
  items!: string[];
  win_rate!: number;
  top4_rate!: number;
  avg_placement!: number;
  sample_size!: number;
}

export class BestItemsDto {
  /** Riot character ID, e.g. "TFT13_Jinx". */
  unit!: string;
  /** Star level of this unit in games analysed (1/2/3). */
  avg_tier!: number;
  /** Top item combos for this unit, ordered by win_rate DESC. */
  combos!: ItemComboDto[];
}

// ── Optimal Augments ───────────────────────────────────────────────────────

export class AugmentDto {
  augment_name!: string;
  top4_rate!: number;
  win_rate!: number;
  avg_placement!: number;
  sample_size!: number;
}

/** Grouped by offer stage: 2-1, 3-2, 4-2. */
export class AugmentPathDto {
  /** Top augments offered at stage 2-1 (augment_index = 0). */
  stage_2_1!: AugmentDto[];
  /** Top augments offered at stage 3-2 (augment_index = 1). */
  stage_3_2!: AugmentDto[];
  /** Top augments offered at stage 4-2 (augment_index = 2). */
  stage_4_2!: AugmentDto[];
}

// ── Level Timing ───────────────────────────────────────────────────────────

export class LevelDistDto {
  l6!: number;
  l7!: number;
  l8!: number;
  l9!: number;
}

export class LevelTimingDto {
  avg_final_level!: number;
  /** % of top-4 games where player reached level 8 or higher. */
  typical_level_8_pct!: number;
  /** Level distribution among top-4 finishers (0–1 fractions). */
  top_players_level_dist!: LevelDistDto;
  avg_gold_left!: number;
}

// ── Unit Priority ──────────────────────────────────────────────────────────

export type UnitRole = 'core' | 'flex' | 'optional';

export class UnitPriorityDto {
  character_id!: string;
  avg_tier!: number; // average star level 1–3
  avg_copies!: number; // avg number built in a game (usually 1 for non-3-star)
  /**
   * % of top-4 games where this unit appeared.
   * ≥ 80% → 'core', 50–80% → 'flex', < 50% → 'optional'.
   */
  top4_appearance_rate!: number;
  role!: UnitRole;
  /**
   * Composite priority: avg_tier × top4_appearance_rate.
   * Higher = more important to the comp.
   */
  priority_score!: number;
}

// ── Full comp deep-dive response ───────────────────────────────────────────

export class CompDeepDiveDto {
  comp_id!: string;
  patch!: string;
  comp_label?: string;
  trait_icons?: string[];
  best_items!: BestItemsDto[];
  augment_path!: AugmentPathDto;
  level_timing!: LevelTimingDto;
  unit_priority!: UnitPriorityDto[];
}
