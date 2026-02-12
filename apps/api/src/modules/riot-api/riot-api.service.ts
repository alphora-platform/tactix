import { Injectable, Logger } from '@nestjs/common';
import { RiotApiClientService } from './riot-api-client.service';
import { Region, getPlatformUrl, getRegionalUrl } from './constants/regions.constants';
import { RiotLeagueEntry, RiotLeagueList, RiotMatchDetail } from './interfaces/riot-api.interfaces';

@Injectable()
export class RiotApiService {
  private readonly logger = new Logger(RiotApiService.name);

  constructor(private readonly client: RiotApiClientService) {}

  // ─── League Endpoints (Platform routing) ───────────────────────────

  async getChallengerLeague(region: Region): Promise<RiotLeagueEntry[]> {
    const baseUrl = getPlatformUrl(region);
    this.logger.log(`Fetching Challenger league for ${region}`);
    const data = await this.client.get<RiotLeagueList>(baseUrl, '/tft/league/v1/challenger');
    return data.entries;
  }

  async getGrandmasterLeague(region: Region): Promise<RiotLeagueEntry[]> {
    const baseUrl = getPlatformUrl(region);
    this.logger.log(`Fetching Grandmaster league for ${region}`);
    const data = await this.client.get<RiotLeagueList>(baseUrl, '/tft/league/v1/grandmaster');
    return data.entries;
  }

  async getMasterLeague(region: Region): Promise<RiotLeagueEntry[]> {
    const baseUrl = getPlatformUrl(region);
    this.logger.log(`Fetching Master league for ${region}`);
    const data = await this.client.get<RiotLeagueList>(baseUrl, '/tft/league/v1/master');
    return data.entries;
  }

  // ─── Match Endpoints (Regional routing) ────────────────────────────

  async getMatchIdsByPuuid(
    region: Region,
    puuid: string,
    count = 20,
    startTime?: number
  ): Promise<string[]> {
    const baseUrl = getRegionalUrl(region);
    this.logger.debug(`Fetching match IDs for ${puuid.substring(0, 8)}... in ${region}`);

    const params: Record<string, unknown> = { count };
    if (startTime) {
      params.startTime = startTime;
    }

    return this.client.get<string[]>(
      baseUrl,
      `/tft/match/v1/matches/by-puuid/${puuid}/ids`,
      params
    );
  }

  async getMatchDetail(region: Region, matchId: string): Promise<RiotMatchDetail> {
    const baseUrl = getRegionalUrl(region);
    this.logger.debug(`Fetching match detail for ${matchId}`);
    return this.client.get<RiotMatchDetail>(baseUrl, `/tft/match/v1/matches/${matchId}`);
  }
}
