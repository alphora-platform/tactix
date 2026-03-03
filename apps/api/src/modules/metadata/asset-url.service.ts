import { Injectable } from '@nestjs/common';
import { MetadataCacheService } from './metadata-cache.service';

const FALLBACK_ICON = 'https://raw.communitydragon.org/latest/game/assets/ux/tft/tft_missing.png';

@Injectable()
export class AssetUrlService {
  constructor(private readonly cache: MetadataCacheService) {}

  async getChampionSquare(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.champions[apiName]?.squareIcon || FALLBACK_ICON;
  }

  async getChampionTile(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.champions[apiName]?.tileIcon || FALLBACK_ICON;
  }

  async getTraitIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.traits[apiName]?.icon || FALLBACK_ICON;
  }

  async getItemIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.items[apiName]?.icon || FALLBACK_ICON;
  }

  async getAugmentIcon(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    return data.augments[apiName]?.icon || FALLBACK_ICON;
  }
}
