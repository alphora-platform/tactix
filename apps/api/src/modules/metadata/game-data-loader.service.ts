import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  TftGameData,
  ChampionData,
  TraitData,
  ItemData,
  AugmentData,
} from './interfaces/metadata.interfaces';

@Injectable()
export class GameDataLoaderService {
  private readonly logger = new Logger(GameDataLoaderService.name);

  constructor(private readonly httpService: HttpService) {}

  async loadFromCommunityDragon(): Promise<TftGameData> {
    this.logger.log('Fetching TFT game data from Community Dragon...');
    const url = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';
    const { data } = await firstValueFrom(this.httpService.get(url, { timeout: 15000 }));

    const champions: Record<string, ChampionData> = {};
    const traits: Record<string, TraitData> = {};
    const items: Record<string, ItemData> = {};
    const augments: Record<string, AugmentData> = {};

    if (data.sets) {
      for (const setKey of Object.keys(data.sets)) {
        const setObj = data.sets[setKey];
        for (const c of setObj.champions || []) {
          if (!c.apiName) continue;
          champions[c.apiName] = {
            name: c.name,
            cost: c.cost || 0,
            traits: c.traits || [],
            tileIcon: this.convertAssetPath(c.tileIcon),
            squareIcon: this.convertAssetPath(c.squareIcon),
          };
        }
        for (const t of setObj.traits || []) {
          if (!t.apiName) continue;
          traits[t.apiName] = {
            name: t.name,
            icon: this.convertAssetPath(t.icon),
            description: t.desc || '',
          };
        }
      }
    }

    // Process items & augments
    for (const it of data.items || []) {
      if (!it.apiName) continue;
      const isAugment =
        it.apiName.toLowerCase().includes('augment') ||
        (it.icon && it.icon.toLowerCase().includes('augments/'));

      if (isAugment) {
        let tier: 'silver' | 'gold' | 'prismatic' = 'gold';
        const iconLower = it.icon ? it.icon.toLowerCase() : '';
        if (
          iconLower.includes('tier1') ||
          iconLower.includes('bronze') ||
          iconLower.includes('_i.')
        ) {
          tier = 'silver';
        } else if (
          iconLower.includes('tier3') ||
          iconLower.includes('prismatic') ||
          iconLower.includes('_iii.')
        ) {
          tier = 'prismatic';
        }

        augments[it.apiName] = {
          name: it.name,
          icon: this.convertAssetPath(it.icon),
          tier,
        };
      } else {
        items[it.apiName] = {
          name: it.name,
          icon: this.convertAssetPath(it.icon),
          description: it.desc || '',
        };
      }
    }

    this.logger.log(
      `Parsed ${Object.keys(champions).length} champions, ${Object.keys(traits).length} traits, ${
        Object.keys(items).length
      } items, ${Object.keys(augments).length} augments`
    );
    return { champions, traits, items, augments };
  }

  convertAssetPath(rawPath: string): string {
    if (!rawPath) return '';
    let normalized = rawPath.replace(/\.tex$/i, '.png');
    normalized = normalized.replace(/^\/?lol-game-data\/assets\//i, '');

    if (!normalized.toLowerCase().startsWith('assets/')) {
      normalized = `assets/${normalized}`;
    }
    normalized = normalized.replace(/\/\//g, '/');

    return `https://raw.communitydragon.org/latest/game/${normalized.toLowerCase()}`;
  }
}
