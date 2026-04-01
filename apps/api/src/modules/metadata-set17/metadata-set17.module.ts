import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Set17Champion } from '../../database/entities/set17-champion.entity';
import { Set17Trait } from '../../database/entities/set17-trait.entity';
import { MetadataSet17Controller } from './metadata-set17.controller';
import { MetadataSet17Service } from './metadata-set17.service';

const SET17_REDIS_CLIENT = 'SET17_REDIS_CLIENT';

@Module({
  imports: [TypeOrmModule.forFeature([Set17Champion, Set17Trait])],
  controllers: [MetadataSet17Controller],
  providers: [
    MetadataSet17Service,
    {
      provide: SET17_REDIS_CLIENT,
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
  exports: [MetadataSet17Service],
})
export class MetadataSet17Module {}
