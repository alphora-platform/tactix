import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameDataLoaderService } from './game-data-loader.service';
import { MetadataCacheService } from './metadata-cache.service';

@Injectable()
export class MetadataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetadataService.name);

  constructor(
    private readonly loader: GameDataLoaderService,
    private readonly cache: MetadataCacheService
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Warming up metadata cache on startup...');
    await this.cache.getOrLoad().catch((err) => {
      this.logger.error(`Failed to warm up metadata cache: ${(err as Error).message}`);
    });
  }

  @Cron('0 0 */6 * * *')
  async scheduledRefresh() {
    this.logger.log('Running scheduled metadata refresh...');
    try {
      const data = await this.loader.loadFromCommunityDragon();
      await this.cache.set(data);
    } catch (err) {
      this.logger.error(`Failed scheduled refresh: ${(err as Error).message}`);
    }
  }
}
