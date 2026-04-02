import {
  Controller,
  Logger,
  Post,
  Body,
  Get,
  UseGuards,
  BadRequestException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DataCollectorService,
  CollectionSummary,
  MatchCollectionSummary,
} from './data-collector.service';
import { CollectorSchedulerService } from './collector-scheduler.service';
import { CrawlSettingsService } from '../settings/crawl-settings.service';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';
import { Public } from '../auth/decorators/public.decorator';
import { QUEUE_NAMES, JOB_NAMES } from './constants/queue.constants';
import { LIVE_REGIONS, PBE_REGIONS, Region } from '../riot-api/constants/regions.constants';

@Controller('data-collector')
export class DataCollectorController {
  private readonly logger = new Logger(DataCollectorController.name);

  constructor(
    private readonly dataCollectorService: DataCollectorService,
    private readonly crawlSettings: CrawlSettingsService,
    @InjectQueue(QUEUE_NAMES.MATCH_COLLECTION)
    private readonly matchQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VIEW_REFRESH)
    private readonly viewRefreshQueue: Queue,
    @Optional() private readonly scheduler: CollectorSchedulerService | null
  ) {}

  /**
   * POST /data-collector/collect-players
   * Enqueues refresh-player-list jobs for all active regions.
   * Returns immediately — work is done by the worker process.
   */
  @Post('collect-players')
  @Public()
  async collectPlayers() {
    const settings = await this.crawlSettings.getSettings();
    const regions =
      settings.crawlMode === 'pbe'
        ? PBE_REGIONS
        : (settings.activeRegions as Region[]).filter((r) => LIVE_REGIONS.includes(r as Region));

    const batchId = Date.now();
    const jobs = regions.map((region) => ({
      name: JOB_NAMES.REFRESH_PLAYER_LIST,
      data: { region },
      opts: {
        jobId: `refresh-player-list-${region}-manual-${batchId}`,
        priority: 4,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }));

    await this.matchQueue.addBulk(jobs);
    this.logger.log(`[Manual] Enqueued ${regions.length} refresh-player-list jobs`);

    return { queued: regions.length, regions };
  }

  /**
   * POST /data-collector/collect-matches
   * Enqueues collect-region jobs for all active regions.
   * Returns immediately — work is done by the worker process.
   */
  @Post('collect-matches')
  @Public()
  async collectMatches() {
    const settings = await this.crawlSettings.getSettings();
    const regions =
      settings.crawlMode === 'pbe'
        ? PBE_REGIONS
        : (settings.activeRegions as Region[]).filter((r) => LIVE_REGIONS.includes(r as Region));

    const batchId = Date.now();
    const tiers: Array<'CHALLENGER' | 'GRANDMASTER' | 'MASTER'> = [
      'CHALLENGER',
      'GRANDMASTER',
      'MASTER',
    ];
    const jobs = regions.map((region) => ({
      name: JOB_NAMES.COLLECT_REGION,
      data: { region, tiers },
      opts: {
        jobId: `collect-region-${region}-manual-${batchId}`,
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2_000, age: 7 * 24 * 3_600 },
      },
    }));

    await this.matchQueue.addBulk(jobs);
    this.logger.log(`[Manual] Enqueued ${regions.length} collect-region jobs`);

    return { queued: regions.length, regions };
  }

  /**
   * POST /data-collector/refresh-views
   * Enqueues a materialized-view refresh job.
   * Returns immediately — work is done by the worker process.
   */
  @Post('refresh-views')
  @Public()
  async refreshViews() {
    const jobId = `refresh-views-manual-${Date.now()}`;

    await this.viewRefreshQueue.add(
      JOB_NAMES.REFRESH_VIEWS,
      {},
      {
        jobId,
        priority: 3,
        attempts: 2,
        backoff: { type: 'fixed' as const, delay: 30_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 200 },
      }
    );

    this.logger.log(`[Manual] Enqueued view-refresh job (${jobId})`);
    return { queued: 1, jobId };
  }

  /**
   * POST /data-collector/seed-pbe-players
   * Manually seeds PBE players by PUUID.
   *
   * PBE has no Challenger/GM/Master leaderboard, so players cannot be
   * auto-discovered. Seed with your own PUUID and known PBE testers.
   * Body: { puuids: string[] }
   */
  @Post('seed-pbe-players')
  @UseGuards(AdminApiKeyGuard)
  async seedPbePlayers(@Body() body: { puuids: unknown }) {
    if (!Array.isArray(body.puuids) || body.puuids.some((p) => typeof p !== 'string')) {
      throw new BadRequestException('body.puuids must be a non-empty string array');
    }
    const puuids = body.puuids as string[];
    if (puuids.length === 0) throw new BadRequestException('puuids array cannot be empty');

    this.logger.log(`[PBE] Seeding ${puuids.length} PBE players`);
    return this.dataCollectorService.seedPbePlayers(puuids);
  }

  /**
   * GET /data-collector/mode
   * Returns the current collector mode ('pbe' | 'live').
   */
  @Get('mode')
  @UseGuards(AdminApiKeyGuard)
  getMode() {
    if (!this.scheduler) {
      throw new ServiceUnavailableException('Scheduler only available in worker process');
    }
    return { mode: this.scheduler.getMode() };
  }

  /**
   * POST /data-collector/switch-mode
   * Switches the collector between 'pbe' and 'live' mode without redeployment.
   * Body: { mode: 'pbe' | 'live' }
   */
  @Post('switch-mode')
  @UseGuards(AdminApiKeyGuard)
  switchMode(@Body() body: { mode: string }) {
    if (!this.scheduler) {
      throw new ServiceUnavailableException('Scheduler only available in worker process');
    }
    if (body.mode !== 'pbe' && body.mode !== 'live') {
      throw new BadRequestException('mode must be "pbe" or "live"');
    }

    const previousMode = this.scheduler.getMode();
    this.scheduler.setMode(body.mode);

    this.logger.log(`Collector mode switched: ${previousMode} → ${body.mode}`);

    return {
      success: true,
      previous_mode: previousMode,
      current_mode: body.mode,
    };
  }
}
