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
import {
  DataCollectorService,
  CollectionSummary,
  MatchCollectionSummary,
} from './data-collector.service';
import { CollectorSchedulerService } from './collector-scheduler.service';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

@Controller('data-collector')
export class DataCollectorController {
  private readonly logger = new Logger(DataCollectorController.name);

  constructor(
    private readonly dataCollectorService: DataCollectorService,
    @Optional() private readonly scheduler: CollectorSchedulerService | null
  ) {}

  @Post('collect-players')
  @UseGuards(AdminApiKeyGuard)
  async collectPlayers(): Promise<CollectionSummary> {
    this.logger.log('Manual player collection triggered');
    return this.dataCollectorService.collectPlayerLists();
  }

  @Post('collect-matches')
  @UseGuards(AdminApiKeyGuard)
  async collectMatches(): Promise<MatchCollectionSummary> {
    this.logger.log('Manual match collection triggered');
    return this.dataCollectorService.collectMatches();
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
