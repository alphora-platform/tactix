import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Match,
  Participant,
  ParticipantUnit,
  ParticipantTrait,
  ParticipantAugment,
  Player,
} from '../../database/entities';
import { RiotMatchDetail } from '../riot-api/interfaces/riot-api.interfaces';
import { RiotApiService } from '../riot-api/riot-api.service';
import { MetaStatsService } from '../analytics/meta-stats.service';

// ─── Validation constants ───────────────────────────────────────────────────

/** Only TFT Ranked queue (live servers). */
const RANKED_QUEUE_ID = 1100;

/**
 * Queue IDs accepted when region = PBE.
 * PBE has no ranked queue — all game modes are valid for data collection:
 *  1090 — TFT Normal
 *  1091 — TFT Draft
 *  1092 — TFT Coop vs AI
 *  1100 — TFT Ranked (included for completeness; may appear on PBE occasionally)
 *  1111 — TFT Fates Beta / set-testing queue
 *  1130 — TFT Hyperroll (PBE)
 */
const PBE_ALLOWED_QUEUE_IDS = new Set([1090, 1091, 1092, 1100, 1111, 1130]);

/** Every standard TFT game has exactly 8 participants. */
const EXPECTED_PARTICIPANT_COUNT = 8;

// ─── Skip reason type ───────────────────────────────────────────────────────

type SkipReason = 'non_ranked' | 'invalid_participant_count' | 'missing_match_id' | 'old_patch';

interface SkipResult {
  skipped: true;
  reason: SkipReason;
  matchId?: string;
}

interface ProcessResult {
  skipped: false;
  matchId: string;
  participantsSaved: number;
}

type EtlResult = SkipResult | ProcessResult;

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * ETL service that transforms raw Riot API match JSON into normalised
 * analytical rows in PostgreSQL.
 *
 * Design goals:
 *  - **Idempotent**: re-processing the same matchId is safe (orIgnore on match,
 *    unique constraint skip on participants).
 *  - **Validated**: non-ranked and malformed matches are rejected with a logged reason.
 *  - **Typed**: uses `RiotMatchDetail` from the riot-api interfaces — no `any`.
 */
@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

  constructor(
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
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    private readonly riotApiService: RiotApiService,
    private readonly metaStatsService: MetaStatsService
  ) {}

  /**
   * Transform a raw Riot match into normalised DB rows.
   *
   * Validation gates (logged + skipped, NOT thrown):
   *  1. `match_id` must be present.
   *  2. `queue_id` must be 1100 (ranked).
   *  3. Participant count must be exactly 8.
   *
   * Idempotency:
   *  - `matches` insert uses `.orIgnore()` — duplicate matchId is silently skipped.
   *  - Each participant is checked for existence before insert.
   *
   * @param raw     The full RiotMatchDetail object from the Riot API.
   * @param region  The region string (e.g. "NA") used to populate `match.region`.
   */
  async processMatch(raw: RiotMatchDetail, region?: string): Promise<EtlResult> {
    const { metadata, info } = raw;

    // ── Gate 1: match_id ──────────────────────────────────────────────
    if (!metadata?.match_id) {
      this.logger.warn('[ETL] Skipping match: missing match_id in metadata');
      return { skipped: true, reason: 'missing_match_id' };
    }

    const matchId = metadata.match_id;

    // ── Gate 2: queue filter ──────────────────────────────────────────
    // PBE has no ranked queue — accept any known TFT queue ID.
    // Live servers only accept ranked (1100) to keep stats clean.
    const isPbe = region === 'PBE';
    const queueAllowed = isPbe
      ? PBE_ALLOWED_QUEUE_IDS.has(info.queue_id)
      : info.queue_id === RANKED_QUEUE_ID;

    if (!queueAllowed) {
      this.logger.debug(
        `[ETL] Skipping ${matchId}: queue_id=${info.queue_id} not allowed ` +
          `(region=${region ?? 'unknown'}, isPbe=${isPbe})`
      );
      return { skipped: true, reason: 'non_ranked', matchId };
    }

    // ── Gate 3: participant count ─────────────────────────────────────
    if (info.participants.length !== EXPECTED_PARTICIPANT_COUNT) {
      this.logger.warn(
        `[ETL] Skipping ${matchId}: got ${info.participants.length} participants, ` +
          `expected ${EXPECTED_PARTICIPANT_COUNT}`
      );
      return { skipped: true, reason: 'invalid_participant_count', matchId };
    }

    // ── Extract patch ("Version 14.3.610.1234" → "14.3") ─────────────
    const patch = this.extractPatch(info.game_version);

    // ── Gate 4: patch version (live only) ────────────────────────────
    // Reject matches from old patches to keep analytics clean.
    // PBE is exempt — it runs ahead of live and patch versions differ.
    if (!isPbe && patch !== 'unknown') {
      const latestPatch = await this.riotApiService.getLatestPatch();
      if (latestPatch && patch !== latestPatch) {
        this.logger.debug(`[ETL] Skipping ${matchId}: patch=${patch} != latest=${latestPatch}`);
        return { skipped: true, reason: 'old_patch', matchId };
      }
    }

    // ── Upsert match (idempotent) ─────────────────────────────────────
    await this.matchRepo
      .createQueryBuilder()
      .insert()
      .into(Match)
      .values({
        matchId,
        gameVersion: info.game_version ?? 'unknown',
        queueId: info.queue_id,
        gameDatetime: new Date(info.game_datetime),
        gameLength: info.game_length,
        tftSetNumber: info.tft_set_number,
        patch,
        region: region ?? undefined,
      })
      .orIgnore() // Skip silently if the match already exists — it's immutable
      .execute();

    // ── Persist participants + relations ──────────────────────────────
    let participantsSaved = 0;

    for (const p of info.participants) {
      // Idempotency check — the unique index (match_id, puuid) enforces this,
      // but we skip early to avoid inserting dangling children for an existing row.
      const existing = await this.participantRepo.findOne({
        where: { matchId, puuid: p.puuid },
        select: ['id'],
      });

      if (existing) continue;

      const participant = this.participantRepo.create({
        matchId,
        puuid: p.puuid,
        placement: p.placement,
        level: p.level,
        goldLeft: p.gold_left,
        lastRound: p.last_round,
        timeEliminated: p.time_eliminated,
        totalDamageToPlayers: p.total_damage_to_players ?? 0,
        playersEliminated: p.players_eliminated ?? 0,
      });

      const saved = await this.participantRepo.save(participant);

      // Units
      if (p.units?.length) {
        const units = p.units.map((u) =>
          this.unitRepo.create({
            matchId,
            puuid: p.puuid,
            characterId: u.character_id,
            tier: u.tier,
            rarity: u.rarity,
            items: u.itemNames ?? [],
            participant: saved,
          })
        );
        await this.unitRepo.save(units);
      }

      // Traits — only active ones (style > 0)
      const activeTraits = (p.traits ?? []).filter((t) => t.style > 0);
      if (activeTraits.length) {
        const traits = activeTraits.map((t) =>
          this.traitRepo.create({
            matchId,
            puuid: p.puuid,
            traitName: t.name,
            numUnits: t.num_units,
            style: t.style,
            tierCurrent: t.tier_current,
            tierTotal: t.tier_total,
            participant: saved,
          })
        );
        await this.traitRepo.save(traits);
      }

      // Augments (array of name strings, position = index)
      if (p.augments?.length) {
        const augments = p.augments.map((augmentName, augmentIndex) =>
          this.augmentRepo.create({
            matchId,
            puuid: p.puuid,
            augmentName,
            augmentIndex,
            participant: saved,
          })
        );
        await this.augmentRepo.save(augments);
      }

      participantsSaved++;
    }

    this.logger.debug(
      `[ETL] ${matchId} → patch=${patch} region=${region ?? 'unknown'} ` +
        `participants=${participantsSaved}/${info.participants.length}`
    );

    // Sync patch_versions table in the background — fire-and-forget so it
    // never delays the match-processing pipeline.
    this.metaStatsService.syncPatchVersions().catch((err: Error) => {
      this.logger.warn(`[ETL] patch sync failed: ${err.message}`);
    });

    // ── PBE viral crawl: auto-seed all 8 participants as PBE players ──
    // PBE has no leaderboard, so we grow the crawl pool organically by
    // registering every participant we encounter. orIgnore ensures we never
    // overwrite an existing player row (e.g. one that was manually seeded).
    if (isPbe) {
      const puuids = info.participants.map((p) => p.puuid);
      await this.playerRepo
        .createQueryBuilder()
        .insert()
        .into(Player)
        .values(
          puuids.map((puuid) => ({
            puuid,
            region: 'PBE',
            summonerName: puuid,
            tier: 'PBE_TESTER',
            lp: 0,
            wins: 0,
            losses: 0,
          }))
        )
        .orIgnore()
        .execute();

      this.logger.debug(`[ETL] [PBE] Auto-seeded ${puuids.length} participants for future crawl`);
    }

    return { skipped: false, matchId, participantsSaved };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Extracts the short patch string from the Riot game_version field.
   *
   * Examples:
   *   "Version 14.3.610.1234 (Jan 01 2024/10:00:00) [PUBLIC] <Releases/14.3>"  → "14.3"
   *   "TFT14.3.610.12345678"                                                    → "14.3"
   *   ""                                                                         → "unknown"
   */
  extractPatch(version: string): string {
    return version?.match(/(\d+\.\d+)/)?.[1] ?? 'unknown';
  }
}
