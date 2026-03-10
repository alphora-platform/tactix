// ── Shared ─────────────────────────────────────────────────────────────────

export type TrendDirection = 'RISING' | 'FALLING' | 'STABLE';
export type Tier = 'S' | 'A' | 'B' | 'C';
export type TimeWindow = '6h' | '12h' | '24h' | '3d' | '7d';

// ── GET /analytics/meta ────────────────────────────────────────────────────

export interface CompStatDto {
  comp_id: string;
  label: string;
  win_rate: number;
  top4_rate: number;
  avg_placement: number;
  sample_size: number;
  trend_direction?: TrendDirection;
  tier?: Tier;
  composite_score?: number;
  /** Friendly display name returned by the backend, if available */
  comp_label?: string;
  /** Trait icon URLs returned by the backend, if available */
  trait_icons?: string[];
}

// ── GET /analytics/tier-list ───────────────────────────────────────────────

export interface TierCompEntry {
  comp_id: string;
  label: string;
  win_rate: number;
  top4_rate: number;
  avg_placement: number;
  sample_size: number;
  composite_score: number;
  tier: Tier;
}

export interface TierListDto {
  patch: string;
  tiers: {
    S: TierCompEntry[];
    A: TierCompEntry[];
    B: TierCompEntry[];
    C: TierCompEntry[];
  };
}

// ── GET /analytics/trend/:compId ──────────────────────────────────────────

export interface TrendWindowDto {
  time_window: TimeWindow;
  win_rate: number;
  top4_rate: number;
  sample_size: number;
}

export interface TrendDto {
  comp_id: string;
  label: string;
  patch: string;
  direction: TrendDirection;
  windows: TrendWindowDto[];
}

// ── GET /analytics/comp/:compId ────────────────────────────────────────────

export interface ItemComboDto {
  items: string[];
  win_rate: number;
  top4_rate: number;
  avg_placement: number;
  sample_size: number;
}

export interface BestItemsDto {
  unit: string;
  avg_tier: number;
  combos: ItemComboDto[];
}

export interface AugmentDto {
  augment_name: string;
  top4_rate: number;
  win_rate: number;
  avg_placement: number;
  sample_size: number;
}

export interface AugmentPathDto {
  stage_2_1: AugmentDto[];
  stage_3_2: AugmentDto[];
  stage_4_2: AugmentDto[];
}

export interface LevelDistDto {
  l6: number;
  l7: number;
  l8: number;
  l9: number;
}

export interface LevelTimingDto {
  avg_final_level: number;
  typical_level_8_pct: number;
  top_players_level_dist: LevelDistDto;
  avg_gold_left: number;
}

export interface UnitPriorityDto {
  character_id: string;
  avg_tier: number;
  avg_copies: number;
  top4_appearance_rate: number;
  role: 'core' | 'flex' | 'optional';
  priority_score: number;
}

export interface CompDetailDto {
  comp_id: string;
  patch: string;
  comp_label?: string;
  trait_icons?: string[];
  best_items: BestItemsDto[];
  augment_path: AugmentPathDto;
  level_timing: LevelTimingDto;
  unit_priority: UnitPriorityDto[];
}

// ── GET /analytics/regions ─────────────────────────────────────────────────

export interface RegionStatDto {
  win_rate: number;
  top4_rate: number;
  avg_placement: number;
  sample_size: number;
  rank: number;
}

export interface RegionalCompDto {
  comp_id: string;
  label: string;
  global_win_rate: number;
  by_region: Record<string, RegionStatDto>;
  regional_diff: number;
}

export interface RegionalMetaDto {
  patch: string;
  regions: string[];
  comps: RegionalCompDto[];
}

export interface RegionalExclusiveDto {
  comp_id: string;
  label: string;
  strong_region: string;
  strong_win_rate: number;
  other_regions_avg: number;
  sample_size: number;
}

export interface CompHeadToHeadDto {
  comp_id: string;
  label: string;
  region_a_win_rate: number;
  region_b_win_rate: number;
  delta: number;
  winner: string;
}

export interface RegionComparisonDto {
  region_a: string;
  region_b: string;
  patch: string;
  meta_similarity: number;
  comps: CompHeadToHeadDto[];
}
