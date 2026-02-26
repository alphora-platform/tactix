import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  BestItemsDto,
  ItemComboDto,
  AugmentPathDto,
  AugmentDto,
  LevelTimingDto,
  UnitPriorityDto,
  UnitRole,
  CompDeepDiveDto,
} from './dto/comp-deep-dive.dto';

// ── Raw query row shapes ───────────────────────────────────────────────────

interface ItemComboRow {
  character_id: string;
  items: string[];
  avg_tier: string;
  sample_size: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface AugmentRow {
  augment_name: string;
  augment_index: string; // 0/1/2
  sample_size: string;
  avg_placement: string;
  top4_rate: string;
  win_rate: string;
}

interface LevelTimingRow {
  avg_final_level: string;
  avg_gold_left: string;
  pct_l6: string;
  pct_l7: string;
  pct_l8: string;
  pct_l9: string;
  pct_level8_plus: string;
}

interface UnitRow {
  character_id: string;
  avg_tier: string;
  avg_copies: string;
  top4_appearance_rate: string;
}

/** Top-N item combos to return per carry unit. */
const TOP_COMBOS_PER_UNIT = 5;

/** Top-N augments to return per stage. */
const TOP_AUGMENTS_PER_STAGE = 3;

/**
 * Rarity threshold for "carry" units — units with rarity ≥ 3 (4-cost, 5-cost)
 * OR star-level (tier) ≥ 3 are considered carries worth itemising.
 * In practice we approximate this via avg_tier or appearance rate.
 */
const CARRY_AVG_TIER_THRESHOLD = 2.0;

/** Appearance rate in top-4 games above which a unit is "core". */
const CORE_THRESHOLD = 0.8;
/** Appearance rate in top-4 games above which a unit is "flex". */
const FLEX_THRESHOLD = 0.5;

@Injectable()
export class CompAnalyzerService {
  private readonly logger = new Logger(CompAnalyzerService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Returns a full deep-dive object for a single comp: best items, optimal
   * augment path, level timing, and unit priority.
   *
   * All four sub-queries run in parallel to minimise response latency.
   */
  async getCompDeepDive(compId: string, patch: string): Promise<CompDeepDiveDto> {
    this.logger.debug(`getCompDeepDive compId=${compId} patch=${patch}`);

    const [bestItems, augmentPath, levelTiming, unitPriority] = await Promise.all([
      this.getBestItems(compId, patch),
      this.getOptimalAugments(compId, patch),
      this.getLevelTiming(compId, patch),
      this.getUnitPriority(compId, patch),
    ]);

    return {
      comp_id: compId,
      patch,
      best_items: bestItems,
      augment_path: augmentPath,
      level_timing: levelTiming,
      unit_priority: unitPriority,
    };
  }

  /**
   * Returns the top-5 item combos for each carry unit appearing in this comp.
   *
   * Data source: mv_item_combo_stats
   * Carry-unit filter: we return all units that appear in the unit-priority
   * result with avg_tier ≥ CARRY_AVG_TIER_THRESHOLD (approximately 2-star or
   * higher on average), then look up their item stats.
   *
   * Ordered by win_rate DESC within each unit.
   */
  async getBestItems(compId: string, patch: string): Promise<BestItemsDto[]> {
    this.logger.debug(`getBestItems compId=${compId} patch=${patch}`);

    // Step 1: Get units in this comp (top4 games only to filter to comp carries).
    //         We get ALL units that appeared in top-4 games; the item lookup below
    //         acts as a second filter (only units with ≥20 combo appearances survive).
    const unitRows = await this.dataSource.query<UnitRow[]>(
      `
      WITH comp_games AS (
        SELECT
          p.match_id,
          p.puuid,
          p.placement
        FROM participants p
        JOIN matches m       ON m.match_id = p.match_id AND m.queue_id = 1100
        JOIN participant_traits pt ON pt.match_id = p.match_id
                                  AND pt.puuid    = p.puuid
                                  AND pt.style    > 0
        WHERE m.patch = $1
          AND p.placement <= 4
        GROUP BY p.match_id, p.puuid, p.placement
        HAVING md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) = $2
      )
      SELECT
        pu.character_id,
        AVG(pu.tier)::text    AS avg_tier,
        AVG(1)::text          AS avg_copies,  -- placeholder; full count in getUnitPriority
        COUNT(DISTINCT pu.match_id)::float / NULLIF(COUNT(DISTINCT cg.match_id), 0)::text
          AS top4_appearance_rate
      FROM comp_games cg
      JOIN participant_units pu
        ON pu.match_id = cg.match_id
       AND pu.puuid    = cg.puuid
      GROUP BY pu.character_id
      HAVING AVG(pu.tier) >= $3
      `,
      [patch, compId, CARRY_AVG_TIER_THRESHOLD]
    );

    if (unitRows.length === 0) return [];

    const characterIds = unitRows.map((r) => r.character_id);
    const placeholders = characterIds.map((_, i) => `$${i + 3}`).join(', ');

    // Step 2: Fetch top-N item combos per unit from mv_item_combo_stats.
    const rows = await this.dataSource.query<ItemComboRow[]>(
      `
      SELECT
        character_id,
        items,
        ${'0'}::text           AS avg_tier,   -- will be filled from unitRows
        sample_size::text,
        avg_placement::text,
        top4_rate::text,
        win_rate::text
      FROM mv_item_combo_stats
      WHERE patch = $1
        AND character_id IN (${placeholders})
        AND array_length(items, 1) > 0
      ORDER BY character_id, win_rate DESC
      `,
      [patch, patch, ...characterIds]
    );

    // Group by character and take top N.
    const grouped = new Map<string, ItemComboDto[]>();
    for (const row of rows) {
      if (!grouped.has(row.character_id)) grouped.set(row.character_id, []);
      const bucket = grouped.get(row.character_id)!;
      if (bucket.length < TOP_COMBOS_PER_UNIT) {
        bucket.push({
          items: row.items,
          win_rate: parseFloat(row.win_rate),
          top4_rate: parseFloat(row.top4_rate),
          avg_placement: parseFloat(row.avg_placement),
          sample_size: parseInt(row.sample_size, 10),
        });
      }
    }

    const tierMap = new Map(unitRows.map((r) => [r.character_id, parseFloat(r.avg_tier)]));

    const result: BestItemsDto[] = [];
    for (const [charId, combos] of grouped) {
      if (combos.length > 0) {
        result.push({
          unit: charId,
          avg_tier: Math.round((tierMap.get(charId) ?? 1) * 100) / 100,
          combos,
        });
      }
    }

    // Sort by avg_tier DESC (highest-star carries first).
    return result.sort((a, b) => b.avg_tier - a.avg_tier);
  }

  /**
   * Returns the top-3 augments per offer stage for this comp.
   *
   * Data source: mv_comp_augment_stats (comp_id × augment_index × patch).
   * Ordered by top4_rate DESC within each stage.
   */
  async getOptimalAugments(compId: string, patch: string): Promise<AugmentPathDto> {
    this.logger.debug(`getOptimalAugments compId=${compId} patch=${patch}`);

    const rows = await this.dataSource.query<AugmentRow[]>(
      `
      SELECT
        augment_name,
        augment_index::text,
        sample_size::text,
        avg_placement::text,
        top4_rate::text,
        win_rate::text
      FROM mv_comp_augment_stats
      WHERE comp_id = $1
        AND patch   = $2
      ORDER BY augment_index ASC, top4_rate DESC
      `,
      [compId, patch]
    );

    const byStage = new Map<number, AugmentDto[]>([
      [0, []],
      [1, []],
      [2, []],
    ]);

    for (const row of rows) {
      const stage = parseInt(row.augment_index, 10);
      const bucket = byStage.get(stage);
      if (!bucket) continue;
      if (bucket.length < TOP_AUGMENTS_PER_STAGE) {
        bucket.push({
          augment_name: row.augment_name,
          top4_rate: parseFloat(row.top4_rate),
          win_rate: parseFloat(row.win_rate),
          avg_placement: parseFloat(row.avg_placement),
          sample_size: parseInt(row.sample_size, 10),
        });
      }
    }

    return {
      stage_2_1: byStage.get(0) ?? [],
      stage_3_2: byStage.get(1) ?? [],
      stage_4_2: byStage.get(2) ?? [],
    };
  }

  /**
   * Returns level timing statistics for top-4 finishers on this comp.
   *
   * The query filters to placement ≤ 4 (i.e. "top players") to derive what
   * level trajectory actually wins — a more useful baseline than all games.
   */
  async getLevelTiming(compId: string, patch: string): Promise<LevelTimingDto> {
    this.logger.debug(`getLevelTiming compId=${compId} patch=${patch}`);

    const rows = await this.dataSource.query<LevelTimingRow[]>(
      `
      WITH comp_top4 AS (
        SELECT
          p.match_id,
          p.puuid,
          p.level,
          p.gold_left,
          p.placement
        FROM participants p
        JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE m.patch = $1
          AND p.placement <= 4
        GROUP BY p.match_id, p.puuid, p.level, p.gold_left, p.placement
        HAVING md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) = $2
      )
      SELECT
        AVG(level)::text                                                              AS avg_final_level,
        AVG(gold_left)::text                                                          AS avg_gold_left,
        (COUNT(*) FILTER (WHERE level = 6)::float / NULLIF(COUNT(*), 0))::text       AS pct_l6,
        (COUNT(*) FILTER (WHERE level = 7)::float / NULLIF(COUNT(*), 0))::text       AS pct_l7,
        (COUNT(*) FILTER (WHERE level = 8)::float / NULLIF(COUNT(*), 0))::text       AS pct_l8,
        (COUNT(*) FILTER (WHERE level >= 9)::float / NULLIF(COUNT(*), 0))::text      AS pct_l9,
        (COUNT(*) FILTER (WHERE level >= 8)::float / NULLIF(COUNT(*), 0))::text      AS pct_level8_plus
      FROM comp_top4
      `,
      [patch, compId]
    );

    const row = rows[0];
    if (!row || row.avg_final_level === null) {
      return {
        avg_final_level: 0,
        typical_level_8_pct: 0,
        avg_gold_left: 0,
        top_players_level_dist: { l6: 0, l7: 0, l8: 0, l9: 0 },
      };
    }

    return {
      avg_final_level: Math.round(parseFloat(row.avg_final_level) * 100) / 100,
      typical_level_8_pct: Math.round(parseFloat(row.pct_level8_plus) * 10_000) / 100, // as %
      avg_gold_left: Math.round(parseFloat(row.avg_gold_left) * 100) / 100,
      top_players_level_dist: {
        l6: Math.round(parseFloat(row.pct_l6) * 10_000) / 100,
        l7: Math.round(parseFloat(row.pct_l7) * 10_000) / 100,
        l8: Math.round(parseFloat(row.pct_l8) * 10_000) / 100,
        l9: Math.round(parseFloat(row.pct_l9) * 10_000) / 100,
      },
    };
  }

  /**
   * Returns all units in this comp ranked by priority score.
   *
   * Priority score = avg_tier × top4_appearance_rate.
   * Units appearing in ≥ 80% of top-4 games → 'core'.
   * Units appearing in 50–80% of top-4 games → 'flex'.
   * Units appearing in < 50% of top-4 games → 'optional'.
   *
   * avg_copies reflects how often the same unit is played multiple times in
   * one game (useful for units that are worth building at 2 or 3 copies on a
   * 3-star carousel reroll comp).
   */
  async getUnitPriority(compId: string, patch: string): Promise<UnitPriorityDto[]> {
    this.logger.debug(`getUnitPriority compId=${compId} patch=${patch}`);

    const rows = await this.dataSource.query<UnitRow[]>(
      `
      WITH comp_top4_games AS (
        -- Find all top-4 games for this comp in this patch.
        SELECT
          p.match_id,
          p.puuid
        FROM participants p
        JOIN matches m ON m.match_id = p.match_id AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE m.patch = $1
          AND p.placement <= 4
        GROUP BY p.match_id, p.puuid
        HAVING md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) = $2
      ),
      total AS (
        SELECT COUNT(*) AS total_games FROM comp_top4_games
      ),
      unit_stats AS (
        SELECT
          pu.character_id,
          AVG(pu.tier)::float                                 AS avg_tier,
          AVG(unit_count)::float                              AS avg_copies,
          -- appearance rate: % of top-4 games this unit appeared in
          COUNT(DISTINCT pu.match_id)::float
            / NULLIF((SELECT total_games FROM total), 0)      AS top4_appearance_rate
        FROM comp_top4_games cg
        JOIN (
          -- Count how many copies of this unit are on board in each game
          SELECT match_id, puuid, character_id, tier,
                 COUNT(*) AS unit_count
          FROM participant_units
          GROUP BY match_id, puuid, character_id, tier
        ) pu ON pu.match_id = cg.match_id AND pu.puuid = cg.puuid
        GROUP BY pu.character_id
      )
      SELECT
        character_id,
        avg_tier::text,
        avg_copies::text,
        top4_appearance_rate::text
      FROM unit_stats
      ORDER BY (avg_tier * top4_appearance_rate) DESC
      `,
      [patch, compId]
    );

    return rows.map((r) => {
      const avgTier = parseFloat(r.avg_tier);
      const appearance = parseFloat(r.top4_appearance_rate);
      const role: UnitRole =
        appearance >= CORE_THRESHOLD ? 'core' : appearance >= FLEX_THRESHOLD ? 'flex' : 'optional';

      return {
        character_id: r.character_id,
        avg_tier: Math.round(avgTier * 100) / 100,
        avg_copies: Math.round(parseFloat(r.avg_copies) * 100) / 100,
        top4_appearance_rate: Math.round(appearance * 10_000) / 100, // as %
        role,
        priority_score: Math.round(avgTier * appearance * 10_000) / 10_000,
      };
    });
  }
}
