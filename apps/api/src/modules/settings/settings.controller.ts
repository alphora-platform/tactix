import { Body, Controller, Get, Logger, Patch } from '@nestjs/common';
import { CrawlSettingsService } from './crawl-settings.service';
import { UpdateCrawlSettingsDto } from './dto/update-crawl-settings.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly crawlSettings: CrawlSettingsService) {}

  @Get('crawl')
  getSettings() {
    this.logger.log('GET /settings/crawl');
    return this.crawlSettings.getSettings();
  }

  @Patch('crawl')
  updateSettings(@Body() dto: UpdateCrawlSettingsDto) {
    this.logger.log(`PATCH /settings/crawl ${JSON.stringify(dto)}`);
    return this.crawlSettings.updateSettings(dto);
  }
}
