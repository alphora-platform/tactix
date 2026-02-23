import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Player,
  Match,
  Participant,
  ParticipantUnit,
  ParticipantTrait,
  ParticipantAugment,
} from '../../database/entities';
import { RiotApiService } from '../riot-api/riot-api.service';
import { Region, DEFAULT_REGIONS } from '../riot-api/constants/regions.constants';
import { RiotLeagueEntry } from '../riot-api/interfaces/riot-api.interfaces';
import { MatchParser, ParsedMatchData } from './match.parser';

// ─── Player Collection Types ─────────────────────────────────────────

interface CollectionResult {
  region: string;
  challenger: number;
  grandmaster: number;
  master: number;
  total: number;
}

export interface CollectionSummary {
  regions: CollectionResult[];
  totalPlayers: number;
  durationMs: number;
}

// ─── Match Collection Types ──────────────────────────────────────────

interface PlayerMatchResult {
  puuid: string;
  region: string;
  matchIdsFetched: number;
  newMatches: number;
  matchesSaved: number;
  skipped: number;
  errors: number;
}

export interface MatchCollectionSummary {
  playersProcessed: number;
  totalNewMatchIds: number;
  totalMatchesSaved: number;
  totalSkipped: number;
  totalErrors: number;
  durationMs: number;
  playerResults: PlayerMatchResult[];
}

@Injectable()
export class DataCollectorService {
  private readonly logger = new Logger(DataCollectorService.name);

  constructor(
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(ParticipantUnit)
    private readonly unitRepo: Repository<ParticipantUnit>,
    @InjectRepository(ParticipantTrait)
    private readonly traitRepo: Repository<ParticipantTrait>,
    @InjectRepository(ParticipantAugment)
    private readonly augmentRepo: Repository<ParticipantAugment>,
    private readonly riotApi: RiotApiService,
    private readonly matchParser: MatchParser
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  PLAYER LIST COLLECTION
  // ═══════════════════════════════════════════════════════════════════

  async collectPlayerLists(regions: Region[] = DEFAULT_REGIONS): Promise<CollectionSummary> {
    const startTime = Date.now();
    const results: CollectionResult[] = [];

    for (const region of regions) {
      try {
        const result = await this.collectRegionPlayers(region);
        results.push(result);
        this.logger.log(
          `[${region}] Collected ${result.total} players ` +
            `(C:${result.challenger} GM:${result.grandmaster} M:${result.master})`
        );
      } catch (error) {
        this.logger.error(`[${region}] Failed to collect players: ${(error as Error).message}`);
        results.push({
          region,
          challenger: 0,
          grandmaster: 0,
          master: 0,
          total: 0,
        });
      }
    }

    const summary: CollectionSummary = {
      regions: results,
      totalPlayers: results.reduce((sum, r) => sum + r.total, 0),
      durationMs: Date.now() - startTime,
    };

    this.logger.log(
      `Collection complete: ${summary.totalPlayers} players in ${summary.durationMs}ms`
    );

    return summary;
  }

  private async collectRegionPlayers(region: Region): Promise<CollectionResult> {
    const [challenger, grandmaster, master] = await Promise.all([
      this.fetchAndUpsertLeague(region, 'CHALLENGER'),
      this.fetchAndUpsertLeague(region, 'GRANDMASTER'),
      this.fetchAndUpsertLeague(region, 'MASTER'),
    ]);

    return {
      region,
      challenger,
      grandmaster,
      master,
      total: challenger + grandmaster + master,
    };
  }

  private async fetchAndUpsertLeague(
    region: Region,
    tier: 'CHALLENGER' | 'GRANDMASTER' | 'MASTER'
  ): Promise<number> {
    let entries: RiotLeagueEntry[];

    switch (tier) {
      case 'CHALLENGER':
        entries = await this.riotApi.getChallengerLeague(region);
        break;
      case 'GRANDMASTER':
        entries = await this.riotApi.getGrandmasterLeague(region);
        break;
      case 'MASTER':
        entries = await this.riotApi.getMasterLeague(region);
        break;
    }

    if (entries.length === 0) {
      return 0;
    }

    await this.upsertPlayers(entries, region, tier);
    return entries.length;
  }

  private async upsertPlayers(
    entries: RiotLeagueEntry[],
    region: Region,
    tier: string
  ): Promise<void> {
    const chunkSize = 500;

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const players = chunk.map((entry) => ({
        puuid: entry.puuid,
        region,
        summonerName: entry.puuid,
        tier,
        lp: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
      }));

      await this.playerRepo
        .createQueryBuilder()
        .insert()
        .into(Player)
        .values(players)
        .orUpdate(['tier', 'lp', 'wins', 'losses', 'updated_at'], ['puuid'])
        .execute();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MATCH COLLECTION
  // ═══════════════════════════════════════════════════════════════════

  async collectMatches(
    regions: Region[] = DEFAULT_REGIONS,
    maxPlayersPerRegion = 50
  ): Promise<MatchCollectionSummary> {
    const startTime = Date.now();
    const playerResults: PlayerMatchResult[] = [];

    for (const region of regions) {
      // Get players from this region, prioritize those not recently fetched
      const players = await this.playerRepo.find({
        where: { region },
        order: { lastFetchAt: { direction: 'ASC', nulls: 'FIRST' } },
        take: maxPlayersPerRegion,
      });

      this.logger.log(`[${region}] Processing ${players.length} players for match collection`);

      for (const player of players) {
        try {
          const result = await this.collectPlayerMatches(player);
          playerResults.push(result);
        } catch (error) {
          this.logger.error(
            `[${region}] Failed to collect matches for ${player.puuid.substring(0, 8)}...: ${
              (error as Error).message
            }`
          );
          playerResults.push({
            puuid: player.puuid,
            region: player.region,
            matchIdsFetched: 0,
            newMatches: 0,
            matchesSaved: 0,
            skipped: 0,
            errors: 1,
          });
        }
      }
    }

    const summary: MatchCollectionSummary = {
      playersProcessed: playerResults.length,
      totalNewMatchIds: playerResults.reduce((sum, r) => sum + r.newMatches, 0),
      totalMatchesSaved: playerResults.reduce((sum, r) => sum + r.matchesSaved, 0),
      totalSkipped: playerResults.reduce((sum, r) => sum + r.skipped, 0),
      totalErrors: playerResults.reduce((sum, r) => sum + r.errors, 0),
      durationMs: Date.now() - startTime,
      playerResults,
    };

    this.logger.log(
      `Match collection complete: ${summary.totalMatchesSaved} matches saved, ` +
        `${summary.totalSkipped} skipped, ${summary.totalErrors} errors in ${summary.durationMs}ms`
    );

    return summary;
  }

  /**
   * Public entry point for the BullMQ processor.
   * Fetches and persists new matches for a single player identified by PUUID.
   */
  async collectPlayerMatchesByPuuid(
    puuid: string,
    region: Region,
    startTime?: number
  ): Promise<PlayerMatchResult> {
    // Build a minimal player-like object so we can reuse the private implementation.
    const player = await this.playerRepo.findOne({ where: { puuid } });
    if (!player) {
      this.logger.warn(`[${region}] Player ${puuid.substring(0, 8)}... not in DB — skipping`);
      return {
        puuid,
        region,
        matchIdsFetched: 0,
        newMatches: 0,
        matchesSaved: 0,
        skipped: 0,
        errors: 0,
      };
    }
    return this.collectPlayerMatches(player, startTime);
  }

  private async collectPlayerMatches(
    player: Player,
    startTimeOverride?: number
  ): Promise<PlayerMatchResult> {
    const region = player.region as Region;
    let matchesSaved = 0;
    let skipped = 0;
    let errors = 0;

    // Incremental fetch: use the override when provided (e.g. from BullMQ job data),
    // otherwise fall back to the player's last known fetch timestamp.
    const startTime =
      startTimeOverride ??
      (player.lastFetchAt ? Math.floor(player.lastFetchAt.getTime() / 1_000) + 1 : undefined);

    // 1. Get match IDs
    const matchIds = await this.riotApi.getMatchIdsByPuuid(region, player.puuid, 20, startTime);

    if (matchIds.length === 0) {
      // Update lastFetchAt even if no new matches
      await this.playerRepo.update(player.puuid, {
        lastFetchAt: new Date(),
      });
      return {
        puuid: player.puuid,
        region: player.region,
        matchIdsFetched: 0,
        newMatches: 0,
        matchesSaved: 0,
        skipped: 0,
        errors: 0,
      };
    }

    // 2. Filter out already-collected matches
    const newMatchIds = await this.filterNewMatchIds(matchIds);

    this.logger.debug(
      `[${region}] Player ${player.puuid.substring(0, 8)}...: ` +
        `${matchIds.length} IDs fetched, ${newMatchIds.length} new`
    );

    // 3. Fetch and save each new match
    for (const matchId of newMatchIds) {
      try {
        const raw = await this.riotApi.getMatchDetail(region, matchId);
        const parsed = this.matchParser.parseMatch(raw);

        if (!parsed) {
          skipped++;
          continue;
        }

        await this.saveMatchData(parsed);
        matchesSaved++;
      } catch (error) {
        this.logger.error(`Failed to process match ${matchId}: ${(error as Error).message}`);
        errors++;
      }
    }

    // 4. Update player's lastFetchAt
    await this.playerRepo.update(player.puuid, {
      lastFetchAt: new Date(),
    });

    return {
      puuid: player.puuid,
      region: player.region,
      matchIdsFetched: matchIds.length,
      newMatches: newMatchIds.length,
      matchesSaved,
      skipped,
      errors,
    };
  }

  /**
   * Filters the given match ID list to only those not already in the DB.
   * Public so the BullMQ processor can call it before enqueuing ETL jobs.
   */
  async filterNewMatchIds(matchIds: string[]): Promise<string[]> {
    if (matchIds.length === 0) return [];

    const existing = await this.matchRepo.find({
      where: { matchId: In(matchIds) },
      select: ['matchId'],
    });

    const existingSet = new Set(existing.map((m) => m.matchId));
    return matchIds.filter((id) => !existingSet.has(id));
  }

  private async saveMatchData(parsed: ParsedMatchData): Promise<void> {
    // 1. Insert match (skip if already exists — immutable data)
    await this.matchRepo
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values(parsed.match)
      .orIgnore()
      .execute();

    // 2. Save participants with nested relations via cascade
    for (const pData of parsed.participants) {
      // Check if participant already exists (dedup)
      const exists = await this.participantRepo.findOne({
        where: { matchId: pData.matchId!, puuid: pData.puuid! },
        select: ['id'],
      });

      if (exists) continue;

      // Create participant entity with nested relations
      const participant = this.participantRepo.create({
        matchId: pData.matchId,
        puuid: pData.puuid,
        placement: pData.placement,
        level: pData.level,
        goldLeft: pData.goldLeft,
        lastRound: pData.lastRound,
        timeEliminated: pData.timeEliminated,
        totalDamageToPlayers: pData.totalDamageToPlayers,
        playersEliminated: pData.playersEliminated,
      });

      const savedParticipant = await this.participantRepo.save(participant);

      // Save units
      if (pData.units.length > 0) {
        const units = pData.units.map((u) =>
          this.unitRepo.create({
            ...u,
            participant: savedParticipant,
          })
        );
        await this.unitRepo.save(units);
      }

      // Save traits
      if (pData.traits.length > 0) {
        const traits = pData.traits.map((t) =>
          this.traitRepo.create({
            ...t,
            participant: savedParticipant,
          })
        );
        await this.traitRepo.save(traits);
      }

      // Save augments
      if (pData.augments.length > 0) {
        const augments = pData.augments.map((a) =>
          this.augmentRepo.create({
            ...a,
            participant: savedParticipant,
          })
        );
        await this.augmentRepo.save(augments);
      }
    }
  }
  /**
   * Stamps `lastFetchAt = now()` on a player record.
   * Called by the BullMQ processor after enqueueing ETL jobs for a player.
   */
  async updatePlayerLastFetchAt(puuid: string): Promise<void> {
    await this.playerRepo.update(puuid, { lastFetchAt: new Date() });
  }
}
