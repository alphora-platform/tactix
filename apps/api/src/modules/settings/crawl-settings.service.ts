import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlSettings } from '../../database/entities/crawl-settings.entity';
import { UpdateCrawlSettingsDto } from './dto/update-crawl-settings.dto';

const DEFAULT_REGIONS = ['kr', 'euw1', 'na1', 'eune1', 'br1'];
const SINGLETON_ID = 1;

@Injectable()
export class CrawlSettingsService {
  private readonly logger = new Logger(CrawlSettingsService.name);

  constructor(
    @InjectRepository(CrawlSettings)
    private readonly repo: Repository<CrawlSettings>
  ) {}

  async getSettings(): Promise<CrawlSettings> {
    let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!settings) {
      settings = this.repo.create({
        id: SINGLETON_ID,
        crawlMode: 'official',
        activeRegions: DEFAULT_REGIONS,
        activePatch: null,
        isEnabled: true,
      });
      await this.repo.save(settings);
      this.logger.log('[CrawlSettings] Initialized default settings');
    }
    return settings;
  }

  async updateSettings(dto: UpdateCrawlSettingsDto): Promise<CrawlSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    await this.repo.save(settings);
    this.logger.log(`[CrawlSettings] Updated: ${JSON.stringify(dto)}`);
    return settings;
  }
}
