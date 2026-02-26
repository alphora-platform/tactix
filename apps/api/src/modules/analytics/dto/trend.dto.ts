export type TrendDirection = 'RISING' | 'FALLING' | 'STABLE';

export type TimeWindow = '6h' | '12h' | '24h' | '3d' | '7d';

export class WindowStatsDto {
  bucket!: TimeWindow;
  win_rate!: number;
  top4_rate!: number;
  avg_placement!: number;
  games!: number;
}

export class TrendDto {
  comp_id!: string;
  trend_direction!: TrendDirection;
  windows!: WindowStatsDto[];
}

export class MetaSnapshotDto {
  comp_id!: string;
  label!: string;
  win_rate!: number;
  top4_rate!: number;
  avg_placement!: number;
  games!: number;
  trend_direction!: TrendDirection;
}
