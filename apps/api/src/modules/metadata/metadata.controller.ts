import { Controller, Get, Post, Query, HttpCode, UseGuards, BadRequestException } from '@nestjs/common';
import { MetadataCacheService } from './metadata-cache.service';
import { GameDataLoaderService } from './game-data-loader.service';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

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
  @UseGuards(AdminApiKeyGuard)
  async forceRefresh() {
    const data = await this.loader.loadFromCommunityDragon();
    await this.cache.set(data);
    return { success: true, message: 'Metadata refreshed from Community Dragon' };
  }

  /**
   * Bootstrap static data for a specific TFT set from Community Dragon.
   * Loads new data and atomically replaces the cache via set().
   *
   * Query params:
   *   - set: set number (e.g., 17)
   *   - env: optional CDragon environment override ('pbe' | 'latest')
   */
  @Post('bootstrap')
  @HttpCode(200)
  @UseGuards(AdminApiKeyGuard)
  async bootstrap(
    @Query('set') setNumber?: string,
    @Query('env') env?: string,
  ) {
    const resolvedEnv = env === 'pbe' || env === 'latest' ? env : undefined;

    let data;
    if (setNumber) {
      const parsed = parseInt(setNumber, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new BadRequestException('Invalid set number');
      }
      data = await this.loader.loadSet(parsed, resolvedEnv);
    } else {
      data = await this.loader.loadFromCommunityDragon(resolvedEnv);
    }

    await this.cache.set(data);

    return {
      success: true,
      message: `Bootstrapped metadata${setNumber ? ` for Set ${setNumber}` : ''} from Community Dragon (${resolvedEnv ?? this.loader.getCDragonEnv()})`,
      stats: {
        champions: Object.keys(data.champions).length,
        traits: Object.keys(data.traits).length,
        items: Object.keys(data.items).length,
        augments: Object.keys(data.augments).length,
      },
    };
  }
}
