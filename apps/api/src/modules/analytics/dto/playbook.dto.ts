import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Tier } from './tier-list.dto';
import { VALID_REGIONS } from './comp-query.dto';

// ── Query DTO ───────────────────────────────────────────────────────────────

export class PlaybookQueryDto {
  @IsOptional()
  @IsString()
  patch?: string;

  @IsOptional()
  @IsIn(VALID_REGIONS)
  region?: string;
}

// ── Item DTO (per-carry item recommendation) ───────────────────────────────

export class PlaybookItemDto {
  item_id!: string;
  win_rate!: number;
  sample_size!: number;
}

// ── Carry DTO (unit + best items) ──────────────────────────────────────────

export class PlaybookCarryDto {
  character_id!: string;
  best_items!: PlaybookItemDto[];
}

// ── Augment stage DTO ──────────────────────────────────────────────────────

export class PlaybookAugmentStageDto {
  augment_name!: string;
  win_rate!: number;
  top4_rate!: number;
  sample_size!: number;
}

// ── Augment path (grouped by stage) ────────────────────────────────────────

export class PlaybookAugmentPathDto {
  stage_2_1!: PlaybookAugmentStageDto[];
  stage_3_2!: PlaybookAugmentStageDto[];
  stage_4_2!: PlaybookAugmentStageDto[];
}

// ── Level timing ───────────────────────────────────────────────────────────

export class PlaybookLevelTimingDto {
  level!: number;
  typical_round!: string;
  gold_needed!: number;
}

// ── Flex route (alternative comp to pivot to) ──────────────────────────────

export class PlaybookFlexRouteDto {
  comp_id!: string;
  label!: string;
  win_rate!: number;
  shared_units!: string[];
}

// ── Single playbook comp entry ─────────────────────────────────────────────

export class PlaybookCompDto {
  rank!: number;
  comp_id!: string;
  label!: string;
  tier!: Tier;
  win_rate!: number;
  avg_placement!: number;
  top4_rate!: number;
  sample_size!: number;
  carries!: PlaybookCarryDto[];
  augment_path!: PlaybookAugmentPathDto;
  level_timings!: PlaybookLevelTimingDto[];
  flex_routes!: PlaybookFlexRouteDto[];
}

// ── Full playbook response ─────────────────────────────────────────────────

export class PlaybookDto {
  patch!: string;
  updated_at!: string;
  comps!: PlaybookCompDto[];
}
