import { IsOptional, IsString } from 'class-validator';
import { TrackerQueryDto } from './tracker-query.dto';

/** Query params for the econ-curve endpoint (adds compId). */
export class EconQueryDto extends TrackerQueryDto {
  /** MD5 comp fingerprint from a previous proficiency or recent-games call. */
  @IsOptional()
  @IsString()
  compId?: string;
}
