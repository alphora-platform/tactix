import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates two additional materialized views for the Comp Deep-Dive Analyzer.
 *
 * mv_item_combo_stats — win/top4 rate per (character_id, item-combo[], patch).
 *   The combo is stored as a sorted text[] so grouping is canonical regardless
 *   of the order items were stored by the ETL.
 *   Granularity: per full item-combo (up to 3 items), not per individual item.
 *   MIN sample: 20 games.
 *
 * mv_comp_augment_stats — augment performance cross-referenced with comp_id.
 *   Includes augment_index (0=stage-2-1, 1=stage-3-2, 2=stage-4-2) so the
 *   service can group augments by the stage at which they were offered.
 *   comp_id is derived via the same md5(string_agg(trait_name)) fingerprint
 *   used everywhere else, so it joins cleanly with mv_comp_stats.
 *   MIN sample: 15 games.
 *
 * Both require a unique index for REFRESH MATERIALIZED VIEW CONCURRENTLY.
 */
export class CreateCompDeepDiveViews20260226150000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── mv_item_combo_stats ───────────────────────────────────────────────────
    //
    // Groups per (character_id, sorted-item-array, patch).
    // We sort the items[] array canonically with `array_agg(i ORDER BY i) FROM
    // unnest(items)` so "Deathblade,BFSword" and "BFSword,Deathblade" collapse
    // into the same row.
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_item_combo_stats AS
      SELECT
        pu.character_id,
        (SELECT array_agg(i ORDER BY i)
         FROM   unnest(pu.items) AS i)                                         AS items,
        m.patch,
        COUNT(DISTINCT pu.match_id)                                            AS sample_size,
        AVG(p.placement)                                                       AS avg_placement,
        COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
        COUNT(*) FILTER (WHERE p.placement =  1)::float / NULLIF(COUNT(*), 0) AS win_rate
      FROM participant_units pu
      JOIN participants p
        ON p.match_id = pu.match_id
       AND p.puuid    = pu.puuid
      JOIN matches m
        ON m.match_id = p.match_id
       AND m.queue_id = 1100
      WHERE array_length(pu.items, 1) > 0
      GROUP BY
        pu.character_id,
        (SELECT array_agg(i ORDER BY i) FROM unnest(pu.items) AS i),
        m.patch
      HAVING COUNT(DISTINCT pu.match_id) >= 20
      WITH DATA
    `);

    // Unique index over (character_id, items-as-text, patch).
    // We cast to text so it is indexable; array equality works correctly.
    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_item_combo_stats_pk
        ON mv_item_combo_stats (character_id, items, patch)
    `);

    // ── mv_comp_augment_stats ─────────────────────────────────────────────────
    //
    // Cross-references each augment with the comp played in that game.
    // comp_id is derived by the same md5(string_agg(trait_name)) fingerprint.
    // augment_index: 0 = stage 2-1, 1 = stage 3-2, 2 = stage 4-2.
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_comp_augment_stats AS
      WITH comp_per_game AS (
        SELECT
          p.match_id,
          p.puuid,
          p.placement,
          m.patch,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
        FROM participants p
        JOIN matches m
          ON m.match_id = p.match_id
         AND m.queue_id = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        GROUP BY p.match_id, p.puuid, p.placement, m.patch
      )
      SELECT
        pa.augment_name,
        pa.augment_index,
        cpg.comp_id,
        cpg.patch,
        COUNT(*)                                                               AS sample_size,
        AVG(cpg.placement)                                                     AS avg_placement,
        COUNT(*) FILTER (WHERE cpg.placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
        COUNT(*) FILTER (WHERE cpg.placement =  1)::float / NULLIF(COUNT(*), 0) AS win_rate
      FROM participant_augments pa
      JOIN comp_per_game cpg
        ON cpg.match_id = pa.match_id
       AND cpg.puuid    = pa.puuid
      GROUP BY pa.augment_name, pa.augment_index, cpg.comp_id, cpg.patch
      HAVING COUNT(*) >= 15
      WITH DATA
    `);

    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_augment_stats_pk
        ON mv_comp_augment_stats (augment_name, augment_index, comp_id, patch)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_augment_stats`);
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_item_combo_stats`);
  }
}
