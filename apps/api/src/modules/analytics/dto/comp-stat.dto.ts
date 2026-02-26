import { TrendDirection } from './trend.dto';
import type { Tier } from './tier-list.dto';

export class CompStatDto {
  comp_id!: string;
  label!: string;
  win_rate!: number;
  top4_rate!: number;
  avg_placement!: number;
  sample_size!: number;
  /** Populated when mv_comp_trend data is available for this comp. */
  trend_direction?: TrendDirection;
  /** S / A / B / C tier, populated when TierClassificationService data is available. */
  tier?: Tier;
  /** Composite score used to determine tier ranking (0–1 range). */
  composite_score?: number;
}
