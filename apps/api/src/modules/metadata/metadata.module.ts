import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import Redis from 'ioredis';
import { METADATA_REDIS_CLIENT } from './constants/metadata.constants';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { GameDataLoaderService } from './game-data-loader.service';
import { MetadataCacheService } from './metadata-cache.service';
import { FriendlyNameService } from './friendly-name.service';
import { AssetUrlService } from './asset-url.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [MetadataController],
  providers: [
    MetadataService,
    GameDataLoaderService,
    MetadataCacheService,
    FriendlyNameService,
    AssetUrlService,
    {
      provide: METADATA_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
    },
  ],
  exports: [FriendlyNameService, AssetUrlService, MetadataCacheService],
})
export class MetadataModule {}
