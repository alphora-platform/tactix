import { Injectable, Logger } from '@nestjs/common';
import { RiotMatchDetail } from '../riot-api/interfaces/riot-api.interfaces';

export interface ParsedUnit {
  matchId: string;
  puuid: string;
  characterId: string;
  tier: number;
  rarity: number;
  items: string[];
}

export interface ParsedTrait {
  matchId: string;
  puuid: string;
  traitName: string;
  numUnits: number;
  style: number;
  tierCurrent: number;
  tierTotal: number;
}

export interface ParsedAugment {
  matchId: string;
  puuid: string;
  augmentName: string;
  augmentIndex: number;
}

export interface ParsedParticipant {
  matchId: string;
  puuid: string;
  placement: number;
  level: number;
  goldLeft: number;
  lastRound: number;
  timeEliminated: number;
  totalDamageToPlayers: number;
  playersEliminated: number;
  units: ParsedUnit[];
  traits: ParsedTrait[];
  augments: ParsedAugment[];
}

export interface ParsedMatch {
  matchId: string;
  gameVersion: string;
  queueId: number;
  gameDatetime: Date;
  gameLength: number;
  tftSetNumber: number;
}

export interface ParsedMatchData {
  match: ParsedMatch;
  participants: ParsedParticipant[];
}

@Injectable()
export class MatchParser {
  private readonly logger = new Logger(MatchParser.name);

  /**
   * Parses raw Riot API match data into Tactix database entities.
   * Returns null for non-ranked matches or invalid data.
   */
  parseMatch(raw: RiotMatchDetail): ParsedMatchData | null {
    const { metadata, info } = raw;

    if (!metadata?.match_id || !info?.participants?.length) {
      this.logger.warn('Invalid match data: missing match_id or participants');
      return null;
    }

    // Skip non-ranked matches
    if (info.queue_id !== 1100) {
      this.logger.debug(`Skipping non-ranked match ${metadata.match_id} (queue: ${info.queue_id})`);
      return null;
    }

    const match: ParsedMatch = {
      matchId: metadata.match_id,
      gameVersion: this.extractPatch(info.game_version),
      queueId: info.queue_id,
      gameDatetime: new Date(info.game_datetime),
      gameLength: info.game_length,
      tftSetNumber: info.tft_set_number,
    };

    const participants = info.participants
      .filter((p) => this.validateParticipant(p))
      .map((p) => ({
        matchId: metadata.match_id,
        puuid: p.puuid,
        placement: p.placement,
        level: p.level,
        goldLeft: p.gold_left,
        lastRound: p.last_round,
        timeEliminated: p.time_eliminated,
        totalDamageToPlayers: p.total_damage_to_players,
        playersEliminated: p.players_eliminated,
        units: (p.units || [])
          .filter((u) => this.validateUnit(u))
          .map((u) => ({
            matchId: metadata.match_id,
            puuid: p.puuid,
            characterId: u.character_id,
            tier: u.tier,
            rarity: u.rarity,
            items: u.itemNames || [],
          })),
        traits: (p.traits || [])
          .filter((t) => t.style > 0) // Only active traits
          .map((t) => ({
            matchId: metadata.match_id,
            puuid: p.puuid,
            traitName: t.name,
            numUnits: t.num_units,
            style: t.style,
            tierCurrent: t.tier_current,
            tierTotal: t.tier_total,
          })),
        augments: (p.augments || []).map((augmentName, index) => ({
          matchId: metadata.match_id,
          puuid: p.puuid,
          augmentName,
          augmentIndex: index,
        })),
      }));

    return { match, participants };
  }

  /**
   * Extracts patch version: "Version 14.3.610.1234" → "14.3"
   */
  private extractPatch(version: string): string {
    return version?.match(/(\d+\.\d+)/)?.[1] ?? 'unknown';
  }

  private validateParticipant(p: { puuid?: string; placement?: number; level?: number }): boolean {
    return (
      !!p.puuid &&
      p.placement !== undefined &&
      p.placement >= 1 &&
      p.placement <= 8 &&
      p.level !== undefined &&
      p.level >= 1 &&
      p.level <= 11
    );
  }

  private validateUnit(u: { character_id?: string; tier?: number; rarity?: number }): boolean {
    return (
      !!u.character_id &&
      u.tier !== undefined &&
      u.tier >= 1 &&
      u.tier <= 3 &&
      u.rarity !== undefined &&
      u.rarity >= 0 &&
      u.rarity <= 7
    );
  }
}
