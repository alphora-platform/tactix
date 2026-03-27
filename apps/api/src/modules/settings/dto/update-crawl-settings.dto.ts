import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCrawlSettingsDto {
  @IsOptional()
  @IsIn(['pbe', 'official'])
  crawlMode?: 'pbe' | 'official';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeRegions?: string[];

  @IsOptional()
  @IsString()
  activePatch?: string | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
