import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import type { TimeWindow } from './trend.dto';

export const VALID_REGIONS = [
  'na1',
  'euw1',
  'kr',
  'jp1',
  'br1',
  'eun1',
  'oc1',
  'tr1',
  'vn2',
  'pbe1',
] as const;

export class CompQueryDto {
  @IsOptional()
  @IsString()
  patch?: string;

  @IsOptional()
  @IsIn(VALID_REGIONS)
  region?: string;

  @IsOptional()
  @IsIn(['6h', '12h', '24h', '3d', '7d'] satisfies TimeWindow[])
  timeWindow?: TimeWindow;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  limit?: number;
}
