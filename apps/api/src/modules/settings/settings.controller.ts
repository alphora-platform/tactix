import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Patch, Post } from '@nestjs/common';
import { CrawlSettingsService } from './crawl-settings.service';
import { DbAdminService } from './db-admin.service';
import { UpdateCrawlSettingsDto } from './dto/update-crawl-settings.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

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

  @Post('db/purge-match-data')
  @HttpCode(HttpStatus.OK)
  purgeMatchData() {
    this.logger.warn('POST /settings/db/purge-match-data triggered');
    return this.dbAdmin.purgeMatchData();
  }
}
