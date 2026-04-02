import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RiotApiClientService } from './riot-api-client.service';
import { Region, getPlatformUrl, getRegionalUrl } from './constants/regions.constants';
import { RiotLeagueEntry, RiotLeagueList, RiotMatchDetail } from './interfaces/riot-api.interfaces';

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

/** Cache TTL for the Data Dragon latest-patch lookup (10 minutes). */
const DDRAGON_CACHE_TTL_MS = 10 * 60 * 1_000;

@Injectable()
export class RiotApiService {
  private readonly logger = new Logger(RiotApiService.name);

  /** In-memory cache for the latest patch from Data Dragon. */
  private cachedLatestPatch: string | null = null;
  private cachedLatestPatchAt = 0;

  constructor(
    private readonly client: RiotApiClientService,
    private readonly httpService: HttpService
  ) {}

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

  // ─── Data Dragon ─────────────────────────────────────────────────────

  /**
   * Fetches the latest game patch from Data Dragon's versions endpoint.
   * Returns the short patch string (e.g. "16.7") or null on failure.
   *
   * Results are cached in memory for 10 minutes to avoid hammering DDragon.
   */
  async getLatestPatch(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedLatestPatch && now - this.cachedLatestPatchAt < DDRAGON_CACHE_TTL_MS) {
      return this.cachedLatestPatch;
    }

    try {
      const response = (await firstValueFrom(
        this.httpService.get<string[]>(DDRAGON_VERSIONS_URL, { timeout: 5_000 })
      )) as { data: string[] };

      const versions = response.data;
      if (!Array.isArray(versions) || versions.length === 0) {
        this.logger.warn('[DDragon] Empty or invalid versions response');
        return this.cachedLatestPatch;
      }

      // versions[0] is the latest, e.g. "16.7.1" → extract "16.7"
      const match = versions[0].match(/(\d+\.\d+)/);
      if (!match) {
        this.logger.warn(`[DDragon] Could not parse patch from version: "${versions[0]}"`);
        return this.cachedLatestPatch;
      }

      this.cachedLatestPatch = match[1];
      this.cachedLatestPatchAt = now;
      this.logger.log(`[DDragon] Latest patch: ${this.cachedLatestPatch}`);
      return this.cachedLatestPatch;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`[DDragon] Failed to fetch versions: ${err.message}`);
      // Return stale cache if available, otherwise null
      return this.cachedLatestPatch;
    }
  }
}
