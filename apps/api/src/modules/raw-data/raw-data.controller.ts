import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { RawDataService } from './raw-data.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('raw-data')
export class RawDataController {
  private readonly logger = new Logger(RawDataController.name);

  constructor(private readonly rawDataService: RawDataService) {}

  @Get('players')
  async getPlayers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('region') region?: string,
    @Query('name') name?: string,
    @Query('tier') tier?: string
  ) {
    this.logger.log(
      `GET /raw-data/players page=${page} limit=${limit} region=${region ?? '-'} name=${
        name ?? '-'
      } tier=${tier ?? '-'}`
    );
    return this.rawDataService.getPlayers({
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
      region: region || undefined,
      name: name || undefined,
      tier: tier || undefined,
    });
  }

  @Get('player/name/:name')
  async getPlayerByName(@Param('name') name: string) {
    this.logger.log(`Fetching raw player data for name: ${name}`);
    return this.rawDataService.getPlayerBySummonerName(name);
  }

  @Get('player/:puuid')
  async getPlayerByPuuid(@Param('puuid') puuid: string) {
    this.logger.log(`Fetching raw player data for puuid: ${puuid}`);
    return this.rawDataService.getPlayerByPuuid(puuid);
  }

  @Get('match/:matchId')
  async getMatch(@Param('matchId') matchId: string) {
    this.logger.log(`Fetching raw match data for ID: ${matchId}`);
    return this.rawDataService.getMatchById(matchId);
  }
}
