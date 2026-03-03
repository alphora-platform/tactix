export type Tier = 'S' | 'A' | 'B' | 'C';

export class TierListEntryDto {
  comp_id!: string;
  label!: string;
  comp_label?: string;
  trait_icons?: string[];
  tier!: Tier;
  composite_score!: number;
  win_rate!: number;
  top4_rate!: number;
  avg_placement!: number;
  sample_size!: number;
  trait_combo!: string[];
}

export class TierListDto {
  patch!: string;
  generated_at!: string; // ISO-8601
  tiers!: {
    S: TierListEntryDto[];
    A: TierListEntryDto[];
    B: TierListEntryDto[];
    C: TierListEntryDto[];
  };
}
