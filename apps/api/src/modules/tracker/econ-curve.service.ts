import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { LevelBucket, EconCurveDto, EconLevelDto } from './dto/tracker-advanced.dto';

// ── Raw query row shapes ───────────────────────────────────────────────────

interface EconRow {
  level_bucket: LevelBucket;
  avg_gold: string;
  games: string;
}

// ── Level bucket mapping ───────────────────────────────────────────────────

/**
 * Level bucket boundaries (PostgreSQL CASE expression):
 *   level  ≤ 5  →  'early'
 *   level  6–7  →  'mid'
 *   level  8–9  →  'late'
 */
const LEVEL_BUCKET_SQL = `
  CASE
    WHEN p.level <= 5 THEN 'early'
    WHEN p.level IN (6, 7) THEN 'mid'
    ELSE 'late'
  END
`;

/**
 * "Meta" is approximated as the top-50th percentile players on the same comp,
 * i.e. those who finished in placement 1–4. This gives a realistic gold-curve
 * for players who already know the comp well enough to top-4.
 */
const META_PLACEMENT_THRESHOLD = 4;

@Injectable()
export class EconCurveService {
  private readonly logger = new Logger(EconCurveService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Returns the player's average gold-left per level bucket on a given comp,
   * alongside the meta average (players who top-4 on the same comp).
   *
   * SQL approach:
   *  1. Finger-print every game with md5(trait_names) to get comp_id.
   *  2. Filter to games where that comp_id = :compId (if provided).
   *  3. Group by level bucket to get avg gold_left.
   *  4. Repeat for meta (all players, placement ≤ 4) to get the reference curve.
   *
   * @param puuid   Player Riot PUUID
   * @param compId  Optional 16-char MD5 comp fingerprint. When omitted, averages
   *                across all comps the player has played.
   * @param patch   Optional patch string. When omitted, all patches are included.
   */
  async getEconCurve(puuid: string, compId?: string, patch?: string): Promise<EconCurveDto> {
    this.logger.debug(
      `getEconCurve puuid=${puuid} compId=${compId ?? 'any'} patch=${patch ?? 'all'}`
    );

    const [playerRows, metaRows] = await Promise.all([
      this.queryPlayerEcon(puuid, compId, patch),
      this.queryMetaEcon(compId, patch),
    ]);

    // Index meta rows by bucket for O(1) lookup.
    const metaByBucket = new Map<LevelBucket, EconRow>(metaRows.map((r) => [r.level_bucket, r]));

    const buckets: LevelBucket[] = ['early', 'mid', 'late'];

    const levels: EconLevelDto[] = buckets
      .map((bucket) => {
        const player = playerRows.find((r) => r.level_bucket === bucket);
        const meta = metaByBucket.get(bucket);

        if (!player) return null; // player has no games in this bucket

        const playerAvgGold = parseFloat(player.avg_gold);
        const metaAvgGold = meta ? parseFloat(meta.avg_gold) : playerAvgGold;

        return {
          level_bucket: bucket,
          player_avg_gold: Math.round(playerAvgGold * 100) / 100,
          meta_avg_gold: Math.round(metaAvgGold * 100) / 100,
          delta: Math.round((playerAvgGold - metaAvgGold) * 100) / 100,
          player_games: parseInt(player.games, 10),
          meta_games: meta ? parseInt(meta.games, 10) : 0,
        };
      })
      .filter((l): l is EconLevelDto => l !== null);

    return { comp_id: compId ?? 'all', patch, levels };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Fetches the player's avg gold_left per level bucket, filtered to a
   * specific comp_id when provided.
   */
  private async queryPlayerEcon(
    puuid: string,
    compId: string | undefined,
    patch: string | undefined
  ): Promise<EconRow[]> {
    return this.dataSource.query<EconRow[]>(
      `
      WITH fingerprinted AS (
        SELECT
          p.match_id,
          p.level,
          p.gold_left,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
        FROM participants p
        JOIN matches m
          ON m.match_id = p.match_id
         AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE p.puuid = $1
          AND ($2::text IS NULL OR m.patch = $2)
        GROUP BY p.match_id, p.level, p.gold_left
      )
      SELECT
        (${LEVEL_BUCKET_SQL.replace(/p\.level/g, 'level')}) AS level_bucket,
        AVG(gold_left)::text   AS avg_gold,
        COUNT(*)::text         AS games
      FROM fingerprinted
      WHERE ($3::text IS NULL OR comp_id = $3)
      GROUP BY level_bucket
      `,
      [puuid, patch ?? null, compId ?? null]
    );
  }

  /**
   * Fetches the meta avg gold_left per level bucket for top-4 finishes on the
   * specified comp (all players). When compId is omitted, averages all comps.
   */
  private async queryMetaEcon(
    compId: string | undefined,
    patch: string | undefined
  ): Promise<EconRow[]> {
    return this.dataSource.query<EconRow[]>(
      `
      WITH fingerprinted AS (
        SELECT
          p.match_id,
          p.level,
          p.gold_left,
          p.placement,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
        FROM participants p
        JOIN matches m
          ON m.match_id = p.match_id
         AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE ($1::text IS NULL OR m.patch = $1)
        GROUP BY p.match_id, p.level, p.gold_left, p.placement
      )
      SELECT
        (${LEVEL_BUCKET_SQL.replace(/p\.level/g, 'level')}) AS level_bucket,
        AVG(gold_left)::text   AS avg_gold,
        COUNT(*)::text         AS games
      FROM fingerprinted
      WHERE placement <= ${META_PLACEMENT_THRESHOLD}
        AND ($2::text IS NULL OR comp_id = $2)
      GROUP BY level_bucket
      `,
      [patch ?? null, compId ?? null]
    );
  }
}
