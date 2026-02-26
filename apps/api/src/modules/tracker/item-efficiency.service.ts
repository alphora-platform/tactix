import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ItemEfficiencyDto } from './dto/tracker-advanced.dto';

// ── Raw query row shapes ───────────────────────────────────────────────────

interface PlayerItemRow {
  character_id: string;
  items: string[]; // PostgreSQL text[]
  player_games: string;
  player_win_rate: string;
  player_top4_rate: string;
}

interface MetaItemRow {
  character_id: string;
  items: string[];
  meta_games: string;
  meta_win_rate: string;
}

/** Minimum number of player games required for a unit+item combo to appear. */
const MIN_PLAYER_GAMES = 3;

@Injectable()
export class ItemEfficiencyService {
  private readonly logger = new Logger(ItemEfficiencyService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * For each (character_id, items[]) combo the player has built at least
   * `MIN_PLAYER_GAMES` times, computes:
   *   - player_win_rate / player_top4_rate
   *   - meta_win_rate (same unit + items, all players)
   *   - efficiency_delta = player_win_rate − meta_win_rate
   *
   * Results are ordered by |efficiency_delta| DESC so the biggest skill gaps
   * (positive or negative) surface first.
   *
   * NOTE: The `items` column in participant_units is a PostgreSQL text[] stored
   * in canonical sorted form by the ETL. We sort again in the query to be safe.
   */
  async getItemEfficiency(puuid: string, patch?: string): Promise<ItemEfficiencyDto[]> {
    this.logger.debug(`getItemEfficiency puuid=${puuid} patch=${patch ?? 'all'}`);

    // ── Step 1: Player stats per (character_id, items) combo ────────────
    const playerRows = await this.dataSource.query<PlayerItemRow[]>(
      `
      SELECT
        pu.character_id,
        -- Canonically sort items within each game to ensure consistent grouping.
        (SELECT array_agg(i ORDER BY i) FROM unnest(pu.items) AS i)   AS items,
        COUNT(DISTINCT pu.match_id)::text                              AS player_games,
        (COUNT(*) FILTER (WHERE p.placement = 1)::float
          / NULLIF(COUNT(*), 0))::text                                AS player_win_rate,
        (COUNT(*) FILTER (WHERE p.placement <= 4)::float
          / NULLIF(COUNT(*), 0))::text                                AS player_top4_rate
      FROM participant_units pu
      JOIN participants p
        ON p.match_id = pu.match_id
       AND p.puuid    = pu.puuid
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      WHERE pu.puuid = $1
        AND ($2::text IS NULL OR m.patch = $2)
        AND array_length(pu.items, 1) > 0
      GROUP BY pu.character_id,
               (SELECT array_agg(i ORDER BY i) FROM unnest(pu.items) AS i)
      HAVING COUNT(DISTINCT pu.match_id) >= $3
      ORDER BY player_games DESC
      `,
      [puuid, patch ?? null, MIN_PLAYER_GAMES]
    );

    if (playerRows.length === 0) return [];

    // ── Step 2: Meta stats for the same combos (all players) ─────────────
    // Build a VALUES(...) list to filter to only the combos the player built.
    // Each combo is identified by (character_id, sorted_items_text).
    const comboFilters = playerRows
      .map((r, i) => {
        const base = i * 2;
        return `(pu.character_id = $${base + 3} AND pu.items::text = $${base + 4}::text)`;
      })
      .join(' OR ');

    const comboParams: unknown[] = playerRows.flatMap((r) => [
      r.character_id,
      `{${r.items.join(',')}}`, // PostgreSQL array literal
    ]);

    const metaRows = await this.dataSource.query<MetaItemRow[]>(
      `
      SELECT
        pu.character_id,
        (SELECT array_agg(i ORDER BY i) FROM unnest(pu.items) AS i) AS items,
        COUNT(DISTINCT pu.match_id)::text                           AS meta_games,
        (COUNT(*) FILTER (WHERE p.placement = 1)::float
          / NULLIF(COUNT(*), 0))::text                             AS meta_win_rate
      FROM participant_units pu
      JOIN participants p
        ON p.match_id = pu.match_id
       AND p.puuid    = pu.puuid
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      WHERE ($1::text IS NULL OR m.patch = $1)
        AND array_length(pu.items, 1) > 0
        AND (${comboFilters})
      GROUP BY pu.character_id,
               (SELECT array_agg(i ORDER BY i) FROM unnest(pu.items) AS i)
      `,
      [patch ?? null, ...comboParams]
    );

    // Key: "characterId|item,item,item"
    const metaKey = (charId: string, items: string[]) => `${charId}|${[...items].sort().join(',')}`;

    const metaMap = new Map(metaRows.map((r) => [metaKey(r.character_id, r.items), r]));

    // ── Step 3: Combine and compute delta ────────────────────────────────
    const results: ItemEfficiencyDto[] = playerRows.map((r) => {
      const meta = metaMap.get(metaKey(r.character_id, r.items));
      const playerWR = parseFloat(r.player_win_rate);
      const metaWR = meta ? parseFloat(meta.meta_win_rate) : playerWR;
      const delta = playerWR - metaWR;

      return {
        character_id: r.character_id,
        items: r.items,
        player_win_rate: playerWR,
        player_top4_rate: parseFloat(r.player_top4_rate),
        player_games: parseInt(r.player_games, 10),
        meta_win_rate: metaWR,
        meta_games: meta ? parseInt(meta.meta_games, 10) : 0,
        efficiency_delta: Math.round(delta * 10_000) / 10_000, // 4dp
      };
    });

    // Sort by |efficiency_delta| DESC — biggest gaps first.
    return results.sort((a, b) => Math.abs(b.efficiency_delta) - Math.abs(a.efficiency_delta));
  }
}
