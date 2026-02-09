# Materialized Views

Pre-computed views powering the Tactix dashboard and Meta Radar.

## Comp Stats (powers Meta Radar)

```sql
CREATE MATERIALIZED VIEW mv_comp_stats AS
WITH participant_comps AS (
  SELECT p.match_id, p.puuid, p.placement, m.game_version AS patch, m.game_datetime,
    array_agg(pt.trait_name ORDER BY pt.trait_name) AS trait_combo,
    array_agg(DISTINCT pu.character_id) FILTER (WHERE pu.tier = 3 OR pu.rarity >= 3) AS core_units
  FROM participants p
  JOIN matches m ON m.match_id = p.match_id
  JOIN participant_traits pt ON pt.match_id = p.match_id AND pt.puuid = p.puuid
  LEFT JOIN participant_units pu ON pu.match_id = p.match_id AND pu.puuid = p.puuid
  WHERE pt.style > 0 AND m.queue_id = 1100
  GROUP BY p.match_id, p.puuid, p.placement, m.game_version, m.game_datetime
)
SELECT patch, trait_combo, md5(array_to_string(trait_combo, ','))::varchar(16) AS comp_id,
  COUNT(*) AS sample_size, AVG(placement) AS avg_placement,
  COUNT(*) FILTER (WHERE placement = 1)::float / NULLIF(COUNT(*), 0) AS win_rate,
  COUNT(*) FILTER (WHERE placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
  AVG(placement) FILTER (WHERE game_datetime >= NOW() - INTERVAL '12 hours') AS avg_placement_recent,
  AVG(placement) FILTER (WHERE game_datetime >= NOW() - INTERVAL '24 hours'
    AND game_datetime < NOW() - INTERVAL '12 hours') AS avg_placement_previous
FROM participant_comps
GROUP BY patch, trait_combo
HAVING COUNT(*) >= 20
WITH DATA;

CREATE UNIQUE INDEX idx_mv_comp_stats_pk ON mv_comp_stats (patch, comp_id);
```

## Item Stats (powers Comp Deep-Dive)

```sql
CREATE MATERIALIZED VIEW mv_item_stats AS
SELECT m.game_version AS patch, pu.character_id, pu.items AS item_combo,
  COUNT(*) AS sample_size, AVG(p.placement) AS avg_placement,
  COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
  COUNT(*) FILTER (WHERE p.placement = 1)::float / NULLIF(COUNT(*), 0) AS win_rate
FROM participant_units pu
JOIN participants p ON p.match_id = pu.match_id AND p.puuid = pu.puuid
JOIN matches m ON m.match_id = p.match_id
WHERE m.queue_id = 1100 AND array_length(pu.items, 1) >= 1
GROUP BY m.game_version, pu.character_id, pu.items
HAVING COUNT(*) >= 10
WITH DATA;

CREATE INDEX idx_mv_item_stats ON mv_item_stats (patch, character_id);
```

## Augment Stats

```sql
CREATE MATERIALIZED VIEW mv_augment_stats AS
SELECT m.game_version AS patch, pa.augment_name, pa.augment_index,
  COUNT(*) AS sample_size, AVG(p.placement) AS avg_placement,
  COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
  COUNT(*) FILTER (WHERE p.placement = 1)::float / NULLIF(COUNT(*), 0) AS win_rate
FROM participant_augments pa
JOIN participants p ON p.match_id = pa.match_id AND p.puuid = pa.puuid
JOIN matches m ON m.match_id = p.match_id
WHERE m.queue_id = 1100
GROUP BY m.game_version, pa.augment_name, pa.augment_index
HAVING COUNT(*) >= 10
WITH DATA;

CREATE INDEX idx_mv_augment ON mv_augment_stats (patch, augment_index);
```

## Player Performance (powers My Stats)

```sql
CREATE MATERIALIZED VIEW mv_player_performance AS
SELECT p.puuid, m.game_version AS patch,
  COUNT(*) AS games_played, AVG(p.placement) AS avg_placement,
  COUNT(*) FILTER (WHERE p.placement = 1)::float / NULLIF(COUNT(*), 0) AS win_rate,
  COUNT(*) FILTER (WHERE p.placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate,
  COUNT(*) FILTER (WHERE p.placement = 1) AS first_count,
  COUNT(*) FILTER (WHERE p.placement = 2) AS second_count,
  COUNT(*) FILTER (WHERE p.placement = 3) AS third_count,
  COUNT(*) FILTER (WHERE p.placement = 4) AS fourth_count,
  COUNT(*) FILTER (WHERE p.placement >= 5) AS bottom4_count
FROM participants p
JOIN matches m ON m.match_id = p.match_id
WHERE m.queue_id = 1100
GROUP BY p.puuid, m.game_version
WITH DATA;

CREATE UNIQUE INDEX idx_mv_player_perf ON mv_player_performance (puuid, patch);
```

## Refresh strategy

```typescript
@Cron('0 */30 * * * *')
async refreshMaterializedViews() {
  const views = ['mv_comp_stats', 'mv_item_stats', 'mv_augment_stats', 'mv_player_performance'];
  for (const view of views) {
    await this.dataSource.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
  }
}
```

| View                  | Refresh Interval | Reason              |
| --------------------- | ---------------- | ------------------- |
| mv_comp_stats         | 30 min           | Core of Meta Radar  |
| mv_item_stats         | 1 hour           | Less time-sensitive |
| mv_augment_stats      | 1 hour           | Less time-sensitive |
| mv_player_performance | 2 hours          | Personal stats      |

Use `CONCURRENTLY` (requires UNIQUE index) to allow reads during refresh.

## Querying views in TypeORM

```typescript
// Option 1: ViewEntity
@ViewEntity({ name: 'mv_comp_stats', expression: '' })
export class CompStatsView {
  @ViewColumn({ name: 'patch' }) patch: string;
  @ViewColumn({ name: 'comp_id' }) compId: string;
  @ViewColumn({ name: 'win_rate' }) winRate: number;
  // ...
}

// Option 2: Raw query
const results = await dataSource.query(
  `SELECT * FROM mv_comp_stats WHERE patch = $1 ORDER BY win_rate DESC LIMIT $2`,
  [patch, 20]
);
```
