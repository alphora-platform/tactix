import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlSettings } from '../../database/entities/crawl-settings.entity';
import { CrawlSettingsService } from './crawl-settings.service';
import { DbAdminService } from './db-admin.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CrawlSettings])],
  controllers: [SettingsController],
  providers: [CrawlSettingsService, DbAdminService],
  exports: [CrawlSettingsService],
})
export class SettingsModule {}
