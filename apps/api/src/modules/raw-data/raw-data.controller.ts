import { Controller, Get, Param, Logger } from '@nestjs/common';
import { RawDataService } from './raw-data.service';

@Controller('raw-data')
export class RawDataController {
  private readonly logger = new Logger(RawDataController.name);

  constructor(private readonly rawDataService: RawDataService) {}

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
