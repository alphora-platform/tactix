import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import { Set17Champion } from '../../database/entities/set17-champion.entity';
import { Set17Trait } from '../../database/entities/set17-trait.entity';
const SET17_REDIS_CLIENT = 'SET17_REDIS_CLIENT';
import { ChampionResponseDto } from './dto/champion-response.dto';
import { TraitResponseDto } from './dto/trait-response.dto';

const PREFIX_REGEX = /^(TFT\d+_?|Set\d+_?|TFT_?)/i;
const CACHE_TTL = 3600; // 1 hour

@Injectable()
export class MetadataSet17Service {
  private readonly logger = new Logger(MetadataSet17Service.name);

  constructor(
    @InjectRepository(Set17Champion)
    private readonly championRepo: Repository<Set17Champion>,
    @InjectRepository(Set17Trait)
    private readonly traitRepo: Repository<Set17Trait>,
    @Inject(SET17_REDIS_CLIENT) private readonly redis: Redis
  ) {}

  async getAllChampions(setNumber = 17): Promise<ChampionResponseDto[]> {
    const cacheKey = `set${setNumber}:champions`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${(err as Error).message}`);
    }

    const champions = await this.championRepo.find({ where: { setNumber } });

    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(champions));
    } catch (err) {
      this.logger.warn(`Redis SETEX failed: ${(err as Error).message}`);
    }

    return champions;
  }

  async getChampionByApiName(apiName: string): Promise<ChampionResponseDto | null> {
    const cacheKey = `set17:champion:${apiName}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${(err as Error).message}`);
    }

    const champion = await this.championRepo.findOne({ where: { apiName } });
    if (!champion) return null;

    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(champion));
    } catch (err) {
      this.logger.warn(`Redis SETEX failed: ${(err as Error).message}`);
    }

    return champion;
  }

  async getAllTraits(setNumber = 17): Promise<TraitResponseDto[]> {
    const cacheKey = `set${setNumber}:traits`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${(err as Error).message}`);
    }

    const traits = await this.traitRepo.find({ where: { setNumber } });

    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(traits));
    } catch (err) {
      this.logger.warn(`Redis SETEX failed: ${(err as Error).message}`);
    }

    return traits;
  }

  async getTraitByApiName(apiName: string): Promise<TraitResponseDto | null> {
    const cacheKey = `set17:trait:${apiName}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      this.logger.warn(`Redis GET failed: ${(err as Error).message}`);
    }

    const trait = await this.traitRepo.findOne({ where: { apiName } });
    if (!trait) return null;

    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(trait));
    } catch (err) {
      this.logger.warn(`Redis SETEX failed: ${(err as Error).message}`);
    }

    return trait;
  }

  async resolveChampionName(apiName: string): Promise<string> {
    const champion = await this.championRepo.findOne({ where: { apiName } });
    if (champion) return champion.displayName;
    const stripped = apiName.replace(PREFIX_REGEX, '');
    return stripped.replace(/([A-Z])/g, ' $1').trim();
  }

  async resolveTraitName(apiName: string): Promise<string> {
    const trait = await this.traitRepo.findOne({ where: { apiName } });
    if (trait) return trait.displayName;
    const stripped = apiName.replace(PREFIX_REGEX, '');
    return stripped.replace(/([A-Z])/g, ' $1').trim();
  }
}
