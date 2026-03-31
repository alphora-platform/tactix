import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `mv_comp_trend` materialized view.
 *
 * The view pre-computes per-comp performance across five rolling time windows
 * (6h, 12h, 24h, 3d, 7d) so trend direction can be derived cheaply at query
 * time without re-scanning participant data.
 *
 * LAG() over (comp_id, patch ORDER BY time_bucket) gives prev_win_rate for
 * the previous (longer) window, which TrendAnalysisService uses to compute
 * RISING / STABLE / FALLING direction.
 *
 * Note: `time_bucket` is ordered lexicographically here (12h < 24h < 3d <
 * 6h < 7d). TrendAnalysisService picks window pairs explicitly by bucket name
 * rather than relying on LAG() ordering, so the lexicographic sort does not
 * affect correctness.
 *
 * Refresh: enqueued into `view-refresh` queue every 30 min by
 * CollectorSchedulerService alongside the other analytics views.
 */
export class CreateCompTrendView1771113600000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── View ─────────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE MATERIALIZED VIEW mv_comp_trend AS
      WITH time_windows AS (
        SELECT
          pc.comp_id,
          pc.patch,
          tb.time_bucket,
          COUNT(*)                                                                  AS games,
          AVG(pc.placement)                                                         AS avg_placement,
          COUNT(*) FILTER (WHERE pc.placement = 1)::float / NULLIF(COUNT(*), 0)    AS win_rate,
          COUNT(*) FILTER (WHERE pc.placement <= 4)::float / NULLIF(COUNT(*), 0)   AS top4_rate
        FROM (
          SELECT
            p.puuid,
            p.match_id,
            p.placement,
            m.game_datetime,
            regexp_replace(m.game_version, 'Version (.+\\..+)\\..*', '\\1') AS patch,
            md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id
          FROM participants p
          JOIN matches           m  ON p.match_id = m.match_id
          JOIN participant_traits pt ON pt.match_id = p.match_id
                                    AND pt.puuid   = p.puuid
          WHERE pt.style > 0
            AND m.queue_id = 1100
          GROUP BY p.puuid, p.match_id, p.placement, m.game_datetime, m.game_version
        ) pc
        CROSS JOIN (
          VALUES ('6h'), ('12h'), ('24h'), ('3d'), ('7d')
        ) AS tb(time_bucket)
        WHERE pc.game_datetime >= NOW() - tb.time_bucket::interval
        GROUP BY pc.comp_id, pc.patch, tb.time_bucket
        HAVING COUNT(*) >= 10
      )
      SELECT
        *,
        LAG(win_rate) OVER (
          PARTITION BY comp_id, patch
          ORDER BY time_bucket
        ) AS prev_win_rate
      FROM time_windows
      WITH DATA
    `);

    // ── Index ─────────────────────────────────────────────────────────────────
    // Non-unique: a comp can appear in multiple patches, but the same
    // (comp_id, patch, time_bucket) combination IS unique — add a unique index
    // so REFRESH CONCURRENTLY works.
    await qr.query(`
      CREATE UNIQUE INDEX idx_mv_comp_trend_pk
        ON mv_comp_trend (comp_id, patch, time_bucket)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_trend`);
  }
}
