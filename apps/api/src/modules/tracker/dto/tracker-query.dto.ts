import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/** Shared query params for tracker endpoints. `puuid` comes from the path param. */
export class TrackerQueryDto {
  /** Short patch string, e.g. "14.3". Defaults to all patches when omitted. */
  @IsOptional()
  @IsString()
  patch?: string;

  /** Number of recent games to return (1–100, default 20). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  limit?: number;
}
