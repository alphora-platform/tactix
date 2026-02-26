import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import type { TimeWindow } from './trend.dto';

export class CompQueryDto {
  @IsOptional()
  @IsString()
  patch?: string;

  @IsOptional()
  @IsString()
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
