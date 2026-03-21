import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Returns the CDragon base path: 'pbe' or 'latest', driven by
   * the COMMUNITY_DRAGON_ENV env var (default: 'latest').
   */
  getCDragonEnv(): string {
    return this.configService.get<string>('COMMUNITY_DRAGON_ENV', 'latest');
  }

  async loadFromCommunityDragon(envOverride?: string): Promise<TftGameData> {
    const env = envOverride ?? this.getCDragonEnv();
    this.logger.log(`Fetching TFT game data from Community Dragon (env: ${env})...`);
    const url = `https://raw.communitydragon.org/${env}/cdragon/tft/en_us.json`;
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
            tileIcon: this.convertAssetPath(c.tileIcon, env),
            squareIcon: this.convertAssetPath(c.squareIcon, env),
          };
        }
        for (const t of setObj.traits || []) {
          if (!t.apiName) continue;
          traits[t.apiName] = {
            name: t.name,
            icon: this.convertAssetPath(t.icon, env),
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
          icon: this.convertAssetPath(it.icon, env),
          tier,
        };
      } else {
        items[it.apiName] = {
          name: it.name,
          icon: this.convertAssetPath(it.icon, env),
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

  /**
   * Load data for a specific set number only.
   * Fetches the full CDragon JSON but filters to the requested set.
   */
  async loadSet(setNumber: number, envOverride?: string): Promise<TftGameData> {
    const env = envOverride ?? this.getCDragonEnv();
    this.logger.log(`Bootstrapping Set ${setNumber} data from Community Dragon (env: ${env})...`);
    const url = `https://raw.communitydragon.org/${env}/cdragon/tft/en_us.json`;
    const { data } = await firstValueFrom(this.httpService.get(url, { timeout: 15000 }));

    const champions: Record<string, ChampionData> = {};
    const traits: Record<string, TraitData> = {};
    const items: Record<string, ItemData> = {};
    const augments: Record<string, AugmentData> = {};

    // CDragon uses set keys like "12", "13", etc.
    const targetKey = String(setNumber);
    if (data.sets && data.sets[targetKey]) {
      const setObj = data.sets[targetKey];
      for (const c of setObj.champions || []) {
        if (!c.apiName) continue;
        champions[c.apiName] = {
          name: c.name,
          cost: c.cost || 0,
          traits: c.traits || [],
          tileIcon: this.convertAssetPath(c.tileIcon, env),
          squareIcon: this.convertAssetPath(c.squareIcon, env),
        };
      }
      for (const t of setObj.traits || []) {
        if (!t.apiName) continue;
        traits[t.apiName] = {
          name: t.name,
          icon: this.convertAssetPath(t.icon, env),
          description: t.desc || '',
        };
      }
    } else {
      this.logger.warn(`Set ${setNumber} not found in CDragon data (env: ${env})`);
    }

    // Items/augments are global, not per-set
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
          icon: this.convertAssetPath(it.icon, env),
          tier,
        };
      } else {
        items[it.apiName] = {
          name: it.name,
          icon: this.convertAssetPath(it.icon, env),
          description: it.desc || '',
        };
      }
    }

    this.logger.log(
      `Set ${setNumber}: ${Object.keys(champions).length} champions, ${
        Object.keys(traits).length
      } traits, ${Object.keys(items).length} items, ${Object.keys(augments).length} augments`
    );
    return { champions, traits, items, augments };
  }

  convertAssetPath(rawPath: string, env?: string): string {
    if (!rawPath) return '';
    const resolvedEnv = env ?? this.getCDragonEnv();
    let normalized = rawPath.replace(/\.tex$/i, '.png');
    normalized = normalized.replace(/^\/?lol-game-data\/assets\//i, '');

    if (!normalized.toLowerCase().startsWith('assets/')) {
      normalized = `assets/${normalized}`;
    }
    normalized = normalized.replace(/\/\//g, '/');

    return `https://raw.communitydragon.org/${resolvedEnv}/game/${normalized.toLowerCase()}`;
  }
}
