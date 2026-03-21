import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import {
  METADATA_REDIS_CLIENT,
  METADATA_CACHE_KEY,
  METADATA_CACHE_TTL_SECONDS,
} from './constants/metadata.constants';
import { TftGameData } from './interfaces/metadata.interfaces';
import { GameDataLoaderService } from './game-data-loader.service';

@Injectable()
export class MetadataCacheService {
  private readonly logger = new Logger(MetadataCacheService.name);
  private memoryCache: TftGameData | null = null;

  constructor(
    @Inject(METADATA_REDIS_CLIENT) private readonly redis: Redis,
    private readonly loader: GameDataLoaderService
  ) {}

  async get(): Promise<TftGameData | null> {
    if (this.memoryCache) return this.memoryCache;

    try {
      const cached = await this.redis.get(METADATA_CACHE_KEY);
      if (cached) {
        this.memoryCache = JSON.parse(cached);
        return this.memoryCache;
      }
    } catch (err) {
      this.logger.warn(`Redis GET failed for metadata: ${(err as Error).message}`);
    }
    return null;
  }

  async set(data: TftGameData): Promise<void> {
    this.memoryCache = data;
    try {
      await this.redis.setex(METADATA_CACHE_KEY, METADATA_CACHE_TTL_SECONDS, JSON.stringify(data));
      this.logger.debug('Metadata cached in Redis');
    } catch (err) {
      this.logger.warn(`Redis SETEX failed for metadata: ${(err as Error).message}`);
    }
  }

  async invalidate(): Promise<void> {
    this.memoryCache = null;
    try {
      await this.redis.del(METADATA_CACHE_KEY);
      this.logger.log('Metadata cache invalidated');
    } catch (err) {
      this.logger.warn(`Redis DEL failed for metadata: ${(err as Error).message}`);
    }
  }

  async getOrLoad(): Promise<TftGameData> {
    let data = await this.get();
    if (!data) {
      this.logger.log('Metadata cache miss. Loading from CDragon...');
      data = await this.loader.loadFromCommunityDragon();
      await this.set(data);
    }
    return data;
  }
}
