# Query Patterns

Optimized QueryBuilder patterns for common Tactix operations.

## Batch insert (transaction)

```typescript
async saveMatchBundle(parsed: { match, participants, units, traits, augments }) {
  await this.dataSource.transaction(async (manager) => {
    await manager.createQueryBuilder().insert().into('matches').values(parsed.match).orIgnore().execute();
    if (parsed.participants.length)
      await manager.createQueryBuilder().insert().into('participants').values(parsed.participants).orIgnore().execute();
    if (parsed.units.length)
      await manager.createQueryBuilder().insert().into('participant_units').values(parsed.units).orIgnore().execute();
    if (parsed.traits.length)
      await manager.createQueryBuilder().insert().into('participant_traits').values(parsed.traits).orIgnore().execute();
    if (parsed.augments.length)
      await manager.createQueryBuilder().insert().into('participant_augments').values(parsed.augments).orIgnore().execute();
  });
}
```

## Top comps by winrate (from materialized view)

```typescript
async getTopComps(patch: string, limit = 20) {
  return this.dataSource.createQueryBuilder()
    .select([
      'cs.comp_id AS "compId"', 'cs.trait_combo AS "traitCombo"',
      'cs.win_rate AS "winRate"', 'cs.top4_rate AS "top4Rate"',
      'cs.avg_placement AS "avgPlacement"', 'cs.sample_size AS "sampleSize"',
      `CASE
        WHEN cs.avg_placement_recent < cs.avg_placement_previous THEN 'RISING'
        WHEN cs.avg_placement_recent > cs.avg_placement_previous THEN 'FALLING'
        ELSE 'STABLE' END AS "trend"`,
    ])
    .from('mv_comp_stats', 'cs')
    .where('cs.patch = :patch', { patch })
    .andWhere('cs.sample_size >= 50')
    .orderBy('cs.win_rate', 'DESC')
    .limit(limit)
    .getRawMany();
}
```

## Best items for a unit

```typescript
async getBestItems(patch: string, characterId: string, limit = 5) {
  return this.dataSource.createQueryBuilder()
    .select(['is2.item_combo AS "items"', 'is2.win_rate AS "winRate"', 'is2.sample_size AS "sampleSize"'])
    .from('mv_item_stats', 'is2')
    .where('is2.patch = :patch AND is2.character_id = :characterId', { patch, characterId })
    .andWhere('is2.sample_size >= 20')
    .orderBy('is2.win_rate', 'DESC')
    .limit(limit)
    .getRawMany();
}
```

## Comp detection (dynamic, no hardcoded names)

```typescript
async detectComps(patch: string, minSample = 50) {
  return this.dataSource.query(`
    WITH player_traits AS (
      SELECT p.match_id, p.puuid, p.placement,
        array_agg(pt.trait_name ORDER BY pt.trait_name) AS traits
      FROM participants p
      JOIN matches m ON m.match_id = p.match_id
      JOIN participant_traits pt ON pt.match_id = p.match_id AND pt.puuid = p.puuid
      WHERE m.game_version = $1 AND pt.style > 0 AND m.queue_id = 1100
      GROUP BY p.match_id, p.puuid, p.placement
    )
    SELECT traits AS trait_combo, COUNT(*) AS sample_size,
      AVG(placement) AS avg_placement,
      COUNT(*) FILTER (WHERE placement = 1)::float / NULLIF(COUNT(*), 0) AS win_rate,
      COUNT(*) FILTER (WHERE placement <= 4)::float / NULLIF(COUNT(*), 0) AS top4_rate
    FROM player_traits
    GROUP BY traits HAVING COUNT(*) >= $2
    ORDER BY win_rate DESC
  `, [patch, minSample]);
}
```

## Pagination

```typescript
// common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100) @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  get skip() { return (this.page - 1) * this.limit; }
}

// Usage in service
async findAll(q: PaginationDto): Promise<{ data: T[]; meta: { total; page; limit; totalPages } }> {
  const [data, total] = await repo.findAndCount({ skip: q.skip, take: q.limit, order: { createdAt: 'DESC' } });
  return { data, meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) } };
}
```

## DB health check

```typescript
async getDatabaseHealth() {
  const result = await this.dataSource.query(`
    SELECT numbackends AS active_connections,
      ROUND(blks_hit::float / NULLIF(blks_hit + blks_read, 0) * 100, 2) AS cache_hit_ratio
    FROM pg_stat_database WHERE datname = current_database()
  `);
  return result[0];
}
```
