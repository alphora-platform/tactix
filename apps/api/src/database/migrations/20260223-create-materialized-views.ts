import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates three materialized views for analytics dashboard queries.
 *
 * Views:
 *  - mv_comp_stats    — trait (comp) winrate / playrate by patch
 *  - mv_augment_stats — augment performance (avg placement, top4, winrate) by patch
 *  - mv_item_stats    — item winrate per unit by patch
 *
 * All views are created WITH DATA so they are immediately queryable after migration.
 * Unique indexes are required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
 */
export class CreateMaterializedViews1771027200000 implements MigrationInterface {
  // ── UP ─────────────────────────────────────────────────────────────────────

  async up(qr: QueryRunner): Promise<void> {
    // ── View 1: mv_comp_stats ─────────────────────────────────────────────────
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_comp_stats AS
      SELECT
        pt.trait_name,
        m.patch,
        COUNT(DISTINCT m.match_id)                                             AS games_played,
        AVG(pa.placement)                                                      AS avg_placement,
        COUNT(CASE WHEN pa.placement <= 4 THEN 1 END)::float / COUNT(*)       AS top4_rate,
        COUNT(CASE WHEN pa.placement = 1  THEN 1 END)::float / COUNT(*)       AS win_rate,
        MAX(m.game_datetime)                                                   AS last_seen
      FROM participant_traits pt
      JOIN participants  pa ON pt.match_id = pa.match_id AND pt.puuid = pa.puuid
      JOIN matches       m  ON pt.match_id = m.match_id
      WHERE pt.num_units >= pt.tier_total   -- trait is fully active
      GROUP BY pt.trait_name, m.patch
      WITH DATA
    `);

    // Unique index required for CONCURRENTLY refresh
    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_stats_trait_patch
        ON mv_comp_stats (trait_name, patch)
    `);

    // ── View 2: mv_augment_stats ──────────────────────────────────────────────
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_augment_stats AS
      SELECT
        pag.augment_name,
        m.patch,
        COUNT(DISTINCT m.match_id)                                             AS games_played,
        AVG(pa.placement)                                                      AS avg_placement,
        COUNT(CASE WHEN pa.placement <= 4 THEN 1 END)::float / COUNT(*)       AS top4_rate,
        COUNT(CASE WHEN pa.placement = 1  THEN 1 END)::float / COUNT(*)       AS win_rate,
        MAX(m.game_datetime)                                                   AS last_seen
      FROM participant_augments pag
      JOIN participants  pa ON pag.match_id = pa.match_id AND pag.puuid = pa.puuid
      JOIN matches       m  ON pag.match_id = m.match_id
      GROUP BY pag.augment_name, m.patch
      WITH DATA
    `);

    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_augment_stats_augment_patch
        ON mv_augment_stats (augment_name, patch)
    `);

    // ── View 3: mv_item_stats ─────────────────────────────────────────────────
    //
    // PostgreSQL has no UNNEST over a text[] with a plain JOIN yet we need one
    // row per (character_id, item, patch). We use CROSS JOIN LATERAL to expand
    // the items[] array.
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_item_stats AS
      SELECT
        pu.character_id,
        item_name,
        m.patch,
        COUNT(DISTINCT m.match_id)                                             AS games_played,
        AVG(pa.placement)                                                      AS avg_placement,
        COUNT(CASE WHEN pa.placement <= 4 THEN 1 END)::float / COUNT(*)       AS top4_rate,
        COUNT(CASE WHEN pa.placement = 1  THEN 1 END)::float / COUNT(*)       AS win_rate,
        MAX(m.game_datetime)                                                   AS last_seen
      FROM participant_units pu
      CROSS JOIN LATERAL UNNEST(pu.items) AS item_name
      JOIN participants  pa ON pu.match_id = pa.match_id AND pu.puuid = pa.puuid
      JOIN matches       m  ON pu.match_id = m.match_id
      WHERE array_length(pu.items, 1) > 0
      GROUP BY pu.character_id, item_name, m.patch
      WITH DATA
    `);

    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_item_stats_char_item_patch
        ON mv_item_stats (character_id, item_name, patch)
    `);
  }

  // ── DOWN ───────────────────────────────────────────────────────────────────

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_item_stats`);
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_augment_stats`);
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_stats`);
  }
}
