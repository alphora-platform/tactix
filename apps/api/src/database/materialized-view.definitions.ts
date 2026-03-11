/**
 * Declarative definitions for all analytics materialized views.
 *
 * This is the single source of truth — analogue of TypeORM entity decorators
 * for materialized views. The MaterializedViewSyncService reads this list on
 * every application boot and creates / recreates views that are missing or
 * whose SQL body has changed (detected via a stored MD5 checksum).
 *
 * Order matters: views that depend on others must come after their dependencies.
 *
 * Adding a new view:
 *   1. Append an entry here.
 *   2. Add the view name to ViewRefreshService.VIEWS (alphabetical order).
 *   That's it — no migration file required.
 *
 * Modifying an existing view:
 *   1. Update the `sql` or `uniqueIndex` / `indexes` fields.
 *   2. On next boot, the sync service will DROP + CREATE automatically.
 */

export interface MaterializedViewIndex {
  /** Index name — must be unique within the DB */
  name: string;
  /** Columns that make up the index (e.g. 'comp_id, patch') */
  columns: string;
  /** Set to true for the unique index required by REFRESH CONCURRENTLY */
  unique?: boolean;
}

export interface MaterializedViewDefinition {
  /** Postgres relation name, e.g. 'mv_comp_stats' */
  name: string;
  /**
   * The full SELECT query (without CREATE MATERIALIZED VIEW … AS).
   * Must end with `WITH DATA` or `WITH NO DATA`.
   */
  sql: string;
  /** At least one unique index is required for REFRESH CONCURRENTLY. */
  uniqueIndex: MaterializedViewIndex;
  /** Additional non-unique supporting indexes. */
  indexes?: MaterializedViewIndex[];
}

// ─── View Definitions ────────────────────────────────────────────────────────

export const MATERIALIZED_VIEW_DEFINITIONS: MaterializedViewDefinition[] = [
  // ── 1. mv_comp_stats ─────────────────────────────────────────────────────
  {
    name: 'mv_comp_stats',
    sql: `
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
    `,
    uniqueIndex: {
      name: 'idx_mv_comp_stats_comp_patch',
      columns: 'comp_id, patch',
      unique: true,
    },
    indexes: [{ name: 'idx_mv_comp_stats_patch', columns: 'patch' }],
  },

  // ── 2. mv_augment_stats ──────────────────────────────────────────────────
  {
    name: 'mv_augment_stats',
    sql: `
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
      WHERE m.queue_id  = 1100
        AND m.patch     IS NOT NULL
      GROUP BY pag.augment_name, m.patch
      WITH DATA
    `,
    uniqueIndex: {
      name: 'idx_mv_augment_stats_augment_patch',
      columns: 'augment_name, patch',
      unique: true,
    },
  },

  // ── 3. mv_item_stats ─────────────────────────────────────────────────────
  {
    name: 'mv_item_stats',
    sql: `
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
    `,
    uniqueIndex: {
      name: 'idx_mv_item_stats_char_item_patch',
      columns: 'character_id, item_name, patch',
      unique: true,
    },
  },

  // ── 4. mv_comp_trend ─────────────────────────────────────────────────────
  {
    name: 'mv_comp_trend',
    sql: `
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
          JOIN matches            m  ON p.match_id = m.match_id
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
    `,
    uniqueIndex: {
      name: 'idx_mv_comp_trend_pk',
      columns: 'comp_id, patch, time_bucket',
      unique: true,
    },
  },

  // ── 5. mv_item_combo_stats ───────────────────────────────────────────────
  {
    name: 'mv_item_combo_stats',
    sql: `
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
      HAVING COUNT(DISTINCT pu.match_id) >= 5
      WITH DATA
    `,
    uniqueIndex: {
      name: 'idx_mv_item_combo_stats_pk',
      columns: 'character_id, items, patch',
      unique: true,
    },
  },

  // ── 6. mv_comp_augment_stats ─────────────────────────────────────────────
  {
    name: 'mv_comp_augment_stats',
    sql: `
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
      HAVING COUNT(*) >= 5
      WITH DATA
    `,
    uniqueIndex: {
      name: 'idx_mv_comp_augment_stats_pk',
      columns: 'augment_name, augment_index, comp_id, patch',
      unique: true,
    },
  },

  // ── 7. mv_comp_stats_by_region ───────────────────────────────────────────
  {
    name: 'mv_comp_stats_by_region',
    sql: `
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
        trait_combo,
        COUNT(*)                                                  AS sample_size,
        AVG(placement)                                            AS avg_placement,
        COUNT(*) FILTER (WHERE placement <= 4)::float
          / NULLIF(COUNT(*), 0)                                  AS top4_rate,
        COUNT(*) FILTER (WHERE placement  = 1)::float
          / NULLIF(COUNT(*), 0)                                  AS win_rate
      FROM comp_games
      GROUP BY comp_id, patch, region, trait_combo
      HAVING COUNT(*) >= 10
      WITH DATA
    `,
    uniqueIndex: {
      name: 'idx_mv_comp_stats_by_region_pk',
      columns: 'patch, comp_id, region',
      unique: true,
    },
    indexes: [
      { name: 'idx_mv_comp_stats_by_region_patch', columns: 'patch' },
      { name: 'idx_mv_comp_stats_by_region_comp', columns: 'comp_id, patch' },
    ],
  },
];
