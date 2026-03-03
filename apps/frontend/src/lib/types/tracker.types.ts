// ── GET /tracker/:puuid/placements ─────────────────────────────────────────

export interface PlacementBucket {
  placement: number;
  count: number;
  pct: number;
}

export interface PlacementDistributionDto {
  puuid: string;
  patch: string;
  total_games: number;
  avg_placement: number;
  top4_rate: number;
  win_rate: number;
  distribution: PlacementBucket[];
}

// ── GET /tracker/:puuid/proficiency ────────────────────────────────────────

export interface CompProficiencyEntry {
  comp_id: string;
  label: string;
  games_played: number;
  avg_placement: number;
  best_placement: number;
  top4_rate: number;
  win_rate: number;
  meta_avg_placement: number;
  skill_delta: number; // negative = better than meta
}

export interface CompProficiencyDto {
  puuid: string;
  patch: string;
  comps: CompProficiencyEntry[];
}

// ── GET /tracker/:puuid/recent ─────────────────────────────────────────────

export interface RecentGameDto {
  match_id: string;
  patch: string;
  placement: number;
  game_datetime: string;
  game_length_minutes: number;
  comp_label: string;
  comp_id: string;
  augments: string[];
  units: string[];
}

// ── GET /tracker/:puuid/tilt ───────────────────────────────────────────────

export interface TiltReportDto {
  puuid: string;
  is_tilted: boolean;
  tilt_score: number; // 0–100
  recent_avg_placement: number;
  baseline_avg_placement: number;
  streak_type: 'WIN' | 'LOSS' | 'NONE';
  streak_length: number;
  recommendation: string;
}

// ── GET /tracker/:puuid/report/weekly ──────────────────────────────────────

export interface WeaknessAreaDto {
  area: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface WeaknessReportDto {
  puuid: string;
  patch: string;
  total_games: number;
  avg_placement: number;
  top4_rate: number;
  win_rate: number;
  best_comp: CompProficiencyEntry | null;
  weaknesses: WeaknessAreaDto[];
  improvement_tips: string[];
}
