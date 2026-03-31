import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecreateCompStatsView1771372800000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // Drop the old materialized view
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_stats`);

    // Create the new materialized view that uses comp_id and trait_combo
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_comp_stats AS
      WITH comp_games AS (
        SELECT
          p.puuid,
          p.match_id,
          p.placement,
          m.patch,
          md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id,
          array_agg(pt.trait_name ORDER BY pt.trait_name)                          AS trait_combo
        FROM participants p
        JOIN matches m
          ON m.match_id  = p.match_id
         AND m.queue_id  = 1100
        JOIN participant_traits pt
          ON pt.match_id = p.match_id
         AND pt.puuid    = p.puuid
         AND pt.style    > 0
        WHERE m.patch IS NOT NULL
        GROUP BY p.puuid, p.match_id, p.placement, m.patch
      )
      SELECT
        comp_id,
        patch,
        trait_combo,
        COUNT(*)                                                 AS sample_size,
        AVG(placement)                                           AS avg_placement,
        COUNT(*) FILTER (WHERE placement <= 4)::float
          / NULLIF(COUNT(*), 0)                                  AS top4_rate,
        COUNT(*) FILTER (WHERE placement  = 1)::float
          / NULLIF(COUNT(*), 0)                                  AS win_rate
      FROM comp_games
      GROUP BY comp_id, patch, trait_combo
      HAVING COUNT(*) >= 10
      WITH DATA
    `);

    // Create unique index for concurrent refreshes
    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_stats_comp_patch
        ON mv_comp_stats (comp_id, patch)
    `);

    // Create an index on patch for faster lookups
    await qr.query(`
      CREATE INDEX idx_mv_comp_stats_patch
        ON mv_comp_stats (patch)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_stats`);

    // Revert back to the old one if needed
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

    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_stats_trait_patch
        ON mv_comp_stats (trait_name, patch)
    `);
  }
}
