/**
 * Riot API response interfaces.
 * Based on: https://developer.riotgames.com/apis
 */

// ─── League Endpoints ────────────────────────────────────────────────

export interface RiotLeagueList {
  tier: string;
  leagueId: string;
  queue: string;
  name: string;
  entries: RiotLeagueEntry[];
}

export interface RiotLeagueEntry {
  summonerId: string;
  puuid: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  rank: string;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

// ─── Match Endpoints ─────────────────────────────────────────────────

export interface RiotMatchDetail {
  metadata: {
    data_version: string;
    match_id: string;
    participants: string[];
  };
  info: {
    game_datetime: number;
    game_length: number;
    game_version: string;
    queue_id: number;
    tft_set_number: number;
    participants: RiotParticipant[];
  };
}

export interface RiotParticipant {
  puuid: string;
  placement: number;
  level: number;
  gold_left: number;
  last_round: number;
  time_eliminated: number;
  total_damage_to_players: number;
  players_eliminated: number;
  augments: string[];
  traits: RiotTrait[];
  units: RiotUnit[];
}

export interface RiotTrait {
  name: string;
  num_units: number;
  style: number;
  tier_current: number;
  tier_total: number;
}

export interface RiotUnit {
  character_id: string;
  itemNames: string[];
  name: string;
  rarity: number;
  tier: number;
}
