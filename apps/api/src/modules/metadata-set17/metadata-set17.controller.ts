import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MetadataSet17Service } from './metadata-set17.service';

@Controller('metadata/set17')
@Public()
export class MetadataSet17Controller {
  constructor(private readonly service: MetadataSet17Service) {}

  @Get('champions')
  async getAllChampions() {
    return this.service.getAllChampions();
  }

  @Get('champions/:apiName')
  async getChampionByApiName(@Param('apiName') apiName: string) {
    return this.service.getChampionByApiName(apiName);
  }

  @Get('traits')
  async getAllTraits() {
    return this.service.getAllTraits();
  }

  @Get('traits/:apiName')
  async getTraitByApiName(@Param('apiName') apiName: string) {
    return this.service.getTraitByApiName(apiName);
  }

  @Get('resolve/champion/:apiName')
  async resolveChampion(@Param('apiName') apiName: string) {
    const displayName = await this.service.resolveChampionName(apiName);
    return { apiName, displayName };
  }

  @Get('resolve/trait/:apiName')
  async resolveTrait(@Param('apiName') apiName: string) {
    const displayName = await this.service.resolveTraitName(apiName);
    return { apiName, displayName };
  }
}
