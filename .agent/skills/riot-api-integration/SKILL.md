---
name: riot-api-integration
description: Handles all Riot Games TFT API interactions including endpoint routing, rate limiting, match data fetching, and response parsing. Use when calling Riot API endpoints, implementing rate limiters, setting up multi-region data collection, parsing match JSON into database entities, or working with Data Dragon and Community Dragon for static game data.
---

# Riot API Integration

Covers all patterns for interacting with Riot's TFT API. Riot has specific routing rules, strict rate limits, and data formats that require careful handling.

## When to use this skill

- Fetching player data, match histories, or match details from Riot API
- Implementing or modifying rate limiting logic
- Adding support for new regions or PBE
- Parsing raw match JSON into Tactix entities
- Working with Data Dragon or Community Dragon for champion/item/trait metadata

## Critical rules

1. **Rate limits are hard limits.** Exceeding them gets your key banned. Always implement rate limiting BEFORE making calls.
2. **Routing matters.** League endpoints use platform routing. Match endpoints use regional routing. Wrong routing = 404.
3. **Policy compliance.** NO real-time in-game data. Only post-match analysis.
4. **API key security.** Never commit keys. Use ConfigService.

## Decision tree

```
What Riot API task?
├── Fetch player lists (Challenger/GM/Master)
│   → League endpoints → Platform routing (na1, euw1, kr)
├── Fetch match IDs for a player
│   → Match-by-puuid endpoint → Regional routing (americas, europe, asia)
├── Fetch match detail
│   → Match endpoint → Regional routing
├── Get static data (champions, items, traits)
│   → Community Dragon (no rate limit, no API key needed)
└── Rate limiting issues
    → Check resources/rate-limiter.md
```

## Region routing

The most common source of bugs. Riot uses TWO routing systems:

```typescript
// Platform routing — League/Summoner endpoints
const PLATFORM_ROUTES = {
  NA: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  KR: 'kr',
  JP: 'jp1',
  BR: 'br1',
  OCE: 'oc1',
  TR: 'tr1',
  PBE: 'pbe1',
};

// Regional routing — Match endpoints
const REGIONAL_ROUTES = {
  NA: 'americas',
  BR: 'americas',
  OCE: 'sea',
  KR: 'asia',
  JP: 'asia',
  EUW: 'europe',
  EUNE: 'europe',
  TR: 'europe',
  PBE: 'americas',
};

function getPlatformUrl(region) {
  return `https://${PLATFORM_ROUTES[region]}.api.riotgames.com`;
}
function getRegionalUrl(region) {
  return `https://${REGIONAL_ROUTES[region]}.api.riotgames.com`;
}
```

**Rule: League endpoints → Platform URL. Match endpoints → Regional URL.**

## Module architecture

```
modules/riot-api/
├── riot-api.module.ts              # Exports RiotApiService
├── riot-api.service.ts             # Public facade — other modules use this
├── riot-api-client.service.ts      # Low-level HTTP + rate limiting
├── rate-limiter.service.ts         # Token bucket implementation
├── interfaces/riot-api.interfaces.ts
├── constants/regions.constants.ts
├── exceptions/riot-api.exceptions.ts
├── parsers/match.parser.ts         # Raw JSON → entities
└── __tests__/
```

## Key endpoints

### League (Platform routing)

```
GET /tft/league/v1/challenger       → Challenger player list
GET /tft/league/v1/grandmaster      → GM player list
GET /tft/league/v1/master           → Master player list
```

### Match (Regional routing)

```
GET /tft/match/v1/matches/by-puuid/{puuid}/ids   → Match ID list
    ?count=20&startTime={epoch}
GET /tft/match/v1/matches/{matchId}               → Full match detail
```

## RiotApiService (public facade)

```typescript
@Injectable()
export class RiotApiService {
  constructor(private readonly client: RiotApiClientService) {}

  async getChallengerLeague(region: Region): Promise<LeagueEntry[]> {
    const baseUrl = getPlatformUrl(region);
    const data = await this.client.get(baseUrl, '/tft/league/v1/challenger');
    return data.entries;
  }

  async getMatchIdsByPuuid(
    region: Region,
    puuid: string,
    count = 20,
    startTime?: number
  ): Promise<string[]> {
    const baseUrl = getRegionalUrl(region);
    return this.client.get(baseUrl, `/tft/match/v1/matches/by-puuid/${puuid}/ids`, {
      count,
      startTime,
    });
  }

  async getMatchDetail(region: Region, matchId: string): Promise<MatchDetail> {
    const baseUrl = getRegionalUrl(region);
    return this.client.get(baseUrl, `/tft/match/v1/matches/${matchId}`);
  }
}
```

## RiotApiClient (low-level with rate limiting)

```typescript
@Injectable()
export class RiotApiClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: RateLimiterService
  ) {
    this.apiKey = this.configService.get('riotApi.apiKey');
  }

  async get<T>(baseUrl: string, path: string, params?: Record<string, any>): Promise<T> {
    await this.rateLimiter.acquire();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}${path}`, {
          headers: { 'X-Riot-Token': this.apiKey },
          params,
          timeout: 10000,
        })
      );
      this.rateLimiter.updateFromHeaders(response.headers);
      return response.data;
    } catch (error) {
      this.handleApiError(error, `${baseUrl}${path}`);
    }
  }

  private handleApiError(error: any, url: string): never {
    const status = error?.response?.status;
    switch (status) {
      case 404:
        throw new RiotApiNotFoundException(url);
      case 429:
        throw new RiotApiRateLimitException(
          parseInt(error.response.headers['retry-after'], 10) || 60
        );
      case 403:
        throw new HttpException('API key invalid', 403);
      case 500:
      case 502:
      case 503:
        throw new RiotApiServiceUnavailableException();
      default:
        throw new HttpException(`Riot API error: ${error.message}`, status || 500);
    }
  }
}
```

## Static data sources

No API key or rate limits needed:

| Source           | URL                                                     | Use                                      |
| ---------------- | ------------------------------------------------------- | ---------------------------------------- |
| Data Dragon      | `ddragon.leagueoflegends.com`                           | Basic metadata                           |
| Community Dragon | `raw.communitydragon.org/latest/cdragon/tft/en_us.json` | Detailed unit stats, abilities, augments |

Community Dragon is preferred — it has unit stats, ability scaling, and augment data not in Data Dragon.

## Common pitfalls

- **Wrong routing** — Match endpoints MUST use regional routing
- **Not handling 429** — Always read `retry-after` header and back off
- **Fetching duplicate matches** — Track `lastFetchAt` per player
- **Match ID region prefix** — IDs look like `NA1_1234567890`
- **Dev key expiry** — Dev keys expire every 24h

## Additional resources

See `resources/rate-limiter.md` for production-grade token bucket implementation.
See `resources/match-parser.md` for raw JSON → entity parsing and incremental fetch patterns.
See `resources/endpoints.md` for complete endpoint reference with TypeScript interfaces.
