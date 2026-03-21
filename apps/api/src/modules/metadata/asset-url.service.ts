import { Injectable } from '@nestjs/common';
import { MetadataCacheService } from './metadata-cache.service';
import { GameDataLoaderService } from './game-data-loader.service';

@Injectable()
export class AssetUrlService {
  constructor(
    private readonly cache: MetadataCacheService,
    private readonly loader: GameDataLoaderService,
  ) {}

  private get fallbackIcon(): string {
    const env = this.loader.getCDragonEnv();
    return `https://raw.communitydragon.org/${env}/game/assets/ux/tft/tft_missing.png`;
  }

  async getChampionSquare(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.champions[apiName]?.squareIcon || this.fallbackIcon;
  }

  async getChampionTile(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.champions[apiName]?.tileIcon || this.fallbackIcon;
  }

  async getTraitIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.traits[apiName]?.icon || this.fallbackIcon;
  }

  async getItemIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.items[apiName]?.icon || this.fallbackIcon;
  }

  async getAugmentIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.augments[apiName]?.icon || this.fallbackIcon;
  }
}
