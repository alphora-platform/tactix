import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CrawlSettingsService } from './crawl-settings.service';
import { DbAdminService } from './db-admin.service';
import { UpdateCrawlSettingsDto } from './dto/update-crawl-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly crawlSettings: CrawlSettingsService,
    private readonly dbAdmin: DbAdminService
  ) {}

  @Get('crawl')
  getSettings() {
    return this.crawlSettings.getSettings();
  }

  @Patch('crawl')
  updateSettings(@Body() dto: UpdateCrawlSettingsDto) {
    return this.crawlSettings.updateSettings(dto);
  }

  @Get('db/stats')
  getDbStats() {
    return this.dbAdmin.getStats();
  }
}
