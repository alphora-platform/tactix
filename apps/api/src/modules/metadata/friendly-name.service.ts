import { Injectable, Optional } from '@nestjs/common';
import { MetadataCacheService } from './metadata-cache.service';
import { MetadataSet17Service } from '../metadata-set17/metadata-set17.service';

const PREFIX_REGEX = /^(TFT\d+_?|Set\d+_?|TFT_?)/i;

@Injectable()
export class FriendlyNameService {
  constructor(
    private readonly cache: MetadataCacheService,
    @Optional() private readonly set17?: MetadataSet17Service
  ) {}

  async resolveTraitName(apiName: string): Promise<string> {
    // Try DB lookup first (Set 17 static data)
    if (this.set17) {
      const dbName = await this.set17.resolveTraitName(apiName);
      const stripped = apiName.replace(PREFIX_REGEX, '');
      const fallback = stripped.replace(/([A-Z])/g, ' $1').trim();
      if (dbName !== fallback) return dbName;
    }

    // Fallback to Community Dragon cache
    const data = await this.cache.getOrLoad();
    if (data.traits[apiName]) {
      return data.traits[apiName].name;
    }
    const stripped = apiName.replace(PREFIX_REGEX, '');
    return this.titleCase(stripped.replace(/([A-Z])/g, ' $1').trim());
  }

  async resolveChampionName(apiName: string): Promise<string> {
    // Try DB lookup first (Set 17 static data)
    if (this.set17) {
      const dbName = await this.set17.resolveChampionName(apiName);
      const stripped = apiName.replace(PREFIX_REGEX, '');
      const fallback = stripped.replace(/([A-Z])/g, ' $1').trim();
      if (dbName !== fallback) return dbName;
    }

    // Fallback to Community Dragon cache
    const data = await this.cache.getOrLoad();
    if (data.champions[apiName]) {
      return data.champions[apiName].name;
    }
    const stripped = apiName.replace(PREFIX_REGEX, '');
    return this.titleCase(stripped.replace(/([A-Z])/g, ' $1').trim());
  }

  async resolveCompLabel(traitApiNames: string[]): Promise<string> {
    if (!traitApiNames || traitApiNames.length === 0) return 'Unknown Comp';
    const topTraits = traitApiNames.slice(0, 2);
    const friendlyNames = await Promise.all(topTraits.map((t) => this.resolveTraitName(t)));
    return friendlyNames.join(' ');
  }

  async resolveItemName(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    if (data.items[apiName]) {
      return data.items[apiName].name;
    }
    return this.titleCase(apiName.replace(/^TFT_Item_/i, '').replace(/_/g, ' '));
  }

  async resolveAugmentName(apiName: string): Promise<string> {
    const data = await this.cache.getOrLoad();
    if (data.augments[apiName]) {
      return data.augments[apiName].name;
    }
    return this.titleCase(apiName.replace(/_/g, ' '));
  }

  private titleCase(str: string): string {
    return str
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
}
