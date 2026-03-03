import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { MetadataCacheService } from './metadata-cache.service';
import { GameDataLoaderService } from './game-data-loader.service';

@Controller('metadata')
export class MetadataController {
  constructor(
    private readonly cache: MetadataCacheService,
    private readonly loader: GameDataLoaderService
  ) {}

  @Get('champions')
  async getChampions() {
    const data = await this.cache.getOrLoad();
    return data.champions;
  }

  @Get('traits')
  async getTraits() {
    const data = await this.cache.getOrLoad();
    return data.traits;
  }

  @Get('items')
  async getItems() {
    const data = await this.cache.getOrLoad();
    return data.items;
  }

  @Get('augments')
  async getAugments() {
    const data = await this.cache.getOrLoad();
    return data.augments;
  }

  @Post('refresh')
  @HttpCode(200)
  async forceRefresh() {
    const data = await this.loader.loadFromCommunityDragon();
    await this.cache.set(data);
    return { success: true, message: 'Metadata refreshed from Community Dragon' };
  }
}
