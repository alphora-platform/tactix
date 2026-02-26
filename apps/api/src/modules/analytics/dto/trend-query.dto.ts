import { IsIn, IsOptional, IsString } from 'class-validator';
import type { TimeWindow } from './trend.dto';

/** Query params accepted by GET /analytics/trend/:compId */
export class TrendQueryDto {
  /** Patch string, e.g. "14.3". Defaults to the current patch if omitted. */
  @IsOptional()
  @IsString()
  patch?: string;

  /**
   * Which time window to use for the meta snapshot endpoint.
   * When querying a single comp (GET /analytics/trend/:compId), all windows
   * are always returned — this param filters the snapshot list response.
   */
  @IsOptional()
  @IsIn(['6h', '12h', '24h', '3d', '7d'] satisfies TimeWindow[])
  timeWindow?: TimeWindow;
}
