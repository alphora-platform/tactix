# Riot API Endpoints Reference

## League Endpoints (Platform routing)

```
GET /tft/league/v1/challenger        Host: {platform}.api.riotgames.com
GET /tft/league/v1/grandmaster       Host: {platform}.api.riotgames.com
GET /tft/league/v1/master            Host: {platform}.api.riotgames.com
```

## Match Endpoints (Regional routing)

```
GET /tft/match/v1/matches/by-puuid/{puuid}/ids   Host: {regional}.api.riotgames.com
    Params: count (1-100), startTime (epoch), endTime (epoch), start (offset)
    Returns: string[]

GET /tft/match/v1/matches/{matchId}              Host: {regional}.api.riotgames.com
    Returns: MatchDTO
```

## Static Data (no API key needed)

```
Data Dragon:      https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/tft-champion.json
Community Dragon: https://raw.communitydragon.org/latest/cdragon/tft/en_us.json
```

## TypeScript Interfaces

```typescript
export interface RiotMatchDetail {
  metadata: { data_version: string; match_id: string; participants: string[] };
  info: {
    game_datetime: number; // Epoch ms
    game_length: number; // Seconds
    game_version: string; // "Version 14.3.610.1234"
    queue_id: number; // 1100 = ranked
    tft_set_number: number;
    participants: RiotParticipant[];
  };
}

export interface RiotParticipant {
  puuid: string;
  placement: number; // 1-8
  level: number;
  gold_left: number;
  last_round: number;
  time_eliminated: number;
  total_damage_to_players: number;
  players_eliminated: number;
  augments: string[]; // ["TFT17_Augment_Name", ...]
  traits: RiotTrait[];
  units: RiotUnit[];
}

export interface RiotTrait {
  name: string; // "Set17_Trait_Name"
  num_units: number;
  style: number; // 0=inactive, 1=bronze, 2=silver, 3=gold, 4=chromatic
  tier_current: number;
  tier_total: number;
}

export interface RiotUnit {
  character_id: string; // "TFT17_Unit_Name"
  itemNames: string[];
  name: string;
  rarity: number; // 0=1cost ... 4=5cost
  tier: number; // Star level 1/2/3
}

export interface RiotLeagueEntry {
  summonerId: string;
  puuid: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  rank: string;
  tier: string;
}
```
