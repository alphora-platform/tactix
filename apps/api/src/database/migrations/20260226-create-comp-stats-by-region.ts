import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `mv_comp_stats_by_region` — same structure as `mv_comp_stats` but
 * with an additional `region` dimension.
 *
 * Key differences from mv_comp_stats:
 *  - Groups by (patch, comp_id, region) rather than (patch, comp_id).
 *  - Uses a lower HAVING threshold (≥ 10 games per region) because the data
 *    is split by region.
 *  - Adds a `region` VARCHAR(10) column for filtering.
 *
 * comp_id derivation uses the identical md5(string_agg(trait_name)) fingerprint
 * so values join cleanly with mv_comp_stats and mv_comp_trend.
 *
 * Refresh: registered in ViewRefreshService alongside the other analytics views.
 * Requires a unique index on (patch, comp_id, region) for CONCURRENTLY refresh.
 */
export class CreateCompStatsByRegionView20260226160000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── View ──────────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_comp_stats_by_region AS
      WITH comp_games AS (
        SELECT
          p.puuid,
          p.match_id,
          p.placement,
          m.patch,
          m.region,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id,
          array_agg(pt.trait_name ORDER BY pt.trait_name)                          AS trait_combo
        FROM participants p
        JOIN matches m
          ON m.match_id  = p.match_id
         AND m.queue_id  = 1100
         AND m.region    IS NOT NULL
         AND m.region    <> ''
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE m.patch IS NOT NULL
        GROUP BY p.puuid, p.match_id, p.placement, m.patch, m.region
      )
      SELECT
        comp_id,
        patch,
        region,
        -- Use the first trait_combo for any given comp_id+region (ALL are identical
        -- since they're produced by the same sorted agg).
        (array_agg(trait_combo ORDER BY placement))[1]          AS trait_combo,
        COUNT(*)                                                  AS sample_size,
        AVG(placement)                                            AS avg_placement,
        COUNT(*) FILTER (WHERE placement <= 4)::float
          / NULLIF(COUNT(*), 0)                                  AS top4_rate,
        COUNT(*) FILTER (WHERE placement  = 1)::float
          / NULLIF(COUNT(*), 0)                                  AS win_rate
      FROM comp_games
      GROUP BY comp_id, patch, region
      HAVING COUNT(*) >= 10
      WITH DATA
    `);

    // ── Unique index (required for REFRESH CONCURRENTLY) ──────────────────────
    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_stats_by_region_pk
        ON mv_comp_stats_by_region (patch, comp_id, region)
    `);

    // ── Supporting indexes for common query patterns ───────────────────────────
    await qr.query(`
      CREATE INDEX idx_mv_comp_stats_by_region_patch
        ON mv_comp_stats_by_region (patch)
    `);

    await qr.query(`
      CREATE INDEX idx_mv_comp_stats_by_region_comp
        ON mv_comp_stats_by_region (comp_id, patch)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_stats_by_region`);
  }
}
