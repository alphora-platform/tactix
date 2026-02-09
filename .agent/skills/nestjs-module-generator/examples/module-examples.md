# Example: Analytics API Module

A complete reference implementation of an API module.

## analytics.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MetaSnapshot } from './entities/meta-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetaSnapshot])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

## analytics.controller.ts

```typescript
import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { MetaQueryDto } from './dto/meta-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('meta')
  getMetaOverview(@Query() query: MetaQueryDto) {
    return this.analyticsService.getMetaOverview(query);
  }

  @Get('meta/trends')
  getMetaTrends(@Query() query: MetaQueryDto) {
    return this.analyticsService.getMetaTrends(query);
  }

  @Get('comp/:compId')
  getCompDetail(@Param('compId') compId: string, @Query() query: MetaQueryDto) {
    return this.analyticsService.getCompDetail(compId, query);
  }
}
```

## analytics.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaSnapshot } from './entities/meta-snapshot.entity';
import { MetaQueryDto } from './dto/meta-query.dto';
import { TIER_THRESHOLDS } from './constants/analytics.constants';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(MetaSnapshot)
    private readonly metaSnapshotRepo: Repository<MetaSnapshot>
  ) {}

  async getMetaOverview(query: MetaQueryDto) {
    const { region, timeWindow, limit, patch } = query;

    const qb = this.metaSnapshotRepo
      .createQueryBuilder('ms')
      .where('ms.snapshot_time >= NOW() - :interval::interval', {
        interval: this.timeWindowToInterval(timeWindow),
      })
      .orderBy('ms.winrate', 'DESC')
      .limit(limit);

    if (region) qb.andWhere('ms.region = :region', { region });
    if (patch) qb.andWhere('ms.patch = :patch', { patch });

    const snapshots = await qb.getMany();
    return snapshots.map((s) => ({
      ...s,
      tier: this.classifyTier(s.winrate, s.playRate, s.sampleSize),
    }));
  }

  private classifyTier(
    winrate: number,
    playRate: number,
    sampleSize: number
  ): string {
    if (sampleSize < TIER_THRESHOLDS.MIN_SAMPLE_SIZE) return 'UNRANKED';
    const score =
      winrate * 0.6 +
      (1 - playRate) * 0.2 +
      Math.min(sampleSize / 1000, 1) * 0.2;
    if (score >= TIER_THRESHOLDS.S) return 'S';
    if (score >= TIER_THRESHOLDS.A) return 'A';
    if (score >= TIER_THRESHOLDS.B) return 'B';
    return 'C';
  }

  private timeWindowToInterval(tw: string): string {
    const map: Record<string, string> = {
      '6h': '6 hours',
      '12h': '12 hours',
      '24h': '24 hours',
      '3d': '3 days',
      '7d': '7 days',
    };
    return map[tw] ?? '24 hours';
  }
}
```

## dto/meta-query.dto.ts

```typescript
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class MetaQueryDto {
  @IsOptional()
  region?: string;

  @IsOptional()
  timeWindow?: string = '24h';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  patch?: string;
}
```

# Example: Worker Module (Data Collector)

## data-collector.module.ts

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCollectorService } from './data-collector.service';
import { DataCollectorProcessor } from './data-collector.processor';
import { Match } from './entities/match.entity';
import { Participant } from './entities/participant.entity';
import { RiotApiModule } from '../riot-api/riot-api.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'match-collection' }),
    TypeOrmModule.forFeature([Match, Participant]),
    RiotApiModule,
  ],
  providers: [DataCollectorService, DataCollectorProcessor],
  exports: [DataCollectorService],
})
export class DataCollectorModule {}
```

# Example: Scheduled Module

## scheduler.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataCollectorService } from '../data-collector/data-collector.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly collectorService: DataCollectorService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async collectAllRegions() {
    this.logger.log('Starting scheduled collection for all regions');
    const regions = ['NA', 'EUW', 'KR', 'EUNE', 'BR', 'JP', 'OCE', 'TR'];
    for (const region of regions) {
      await this.collectorService.enqueueRegionCollection(region);
    }
  }
}
```
