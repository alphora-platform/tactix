---
name: database-typeorm
description: Manages PostgreSQL database operations for Tactix using TypeORM. Covers entity design, migrations, materialized views for analytics, upsert and batch insert patterns, query optimization, and indexing strategies. Use when creating entities, writing migrations, building materialized views, optimizing queries, or working with any database-related code.
---

# Database & TypeORM

Manages all PostgreSQL database operations for Tactix. The workload is analytics-heavy: batch writes from data collection, heavy reads for the dashboard, and materialized views for pre-computed statistics.

## When to use this skill

- Creating or modifying TypeORM entities
- Writing or running database migrations
- Creating materialized views for analytics
- Writing complex queries with QueryBuilder
- Optimizing slow queries or adding indexes
- Implementing upsert/dedup logic for match data

## Decision tree

```
What database task?
├── New data model
│   → Create entity, generate migration, add indexes
│   → See resources/entities.md for all Tactix entities
├── Analytics query
│   ├── Pre-computed (dashboard) → Use materialized view
│   ├── Real-time (recent data) → Query with time filter
│   └── Complex aggregation → See resources/query-patterns.md
├── Data ingestion
│   ├── Single record → repository.save()
│   ├── Batch (100+) → Chunked batch insert
│   └── Upsert (may exist) → .orIgnore() or .orUpdate()
├── Performance issue
│   ├── Slow read → Add index, check EXPLAIN ANALYZE
│   ├── Slow write → Use batch insert, check transaction scope
│   └── Stale dashboard → Refresh materialized views
└── Schema change
    → Generate migration, review it, run it
```

## TypeORM setup

```typescript
// common/database/database.module.ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false, // NEVER true in production
    logging: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
    extra: { max: 20, idleTimeoutMillis: 30000 },
  }),
});
```

## Entity design principles

- Table names: `snake_case` plural (`participant_units`)
- Column names: `snake_case` in DB, `camelCase` in code
- Primary keys: natural keys when they exist (`matchId`, `puuid`), UUID otherwise
- Indexes on ALL columns used in WHERE, JOIN, ORDER BY
- Use `@Index()` decorator, composite indexes for common query pairs

## Core entity example

```typescript
@Entity('matches')
@Index(['gameVersion', 'gameDatetime'])
export class Match {
  @PrimaryColumn({ name: 'match_id' })
  matchId: string;

  @Column({ name: 'game_version' })
  @Index()
  gameVersion: string;

  @Column({ name: 'game_datetime', type: 'timestamptz' })
  @Index()
  gameDatetime: Date;

  @Column({ name: 'game_length', type: 'float' })
  gameLength: number;

  @Column({ name: 'tft_set_number', type: 'int' })
  @Index()
  tftSetNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Participant, (p) => p.match, { cascade: true })
  participants: Participant[];
}
```

## Upsert patterns

```typescript
// Insert, skip if exists (matches — immutable)
await repo.createQueryBuilder().insert().into(Match)
  .values(matchData).orIgnore().execute();

// Insert, update on conflict (players — mutable)
await repo.createQueryBuilder().insert().into(Player)
  .values(playerData).orUpdate(['tier', 'lp', 'updated_at'], ['puuid']).execute();

// Batch upsert with chunking
async batchUpsert(data: any[], chunkSize = 500) {
  for (let i = 0; i < data.length; i += chunkSize) {
    await repo.createQueryBuilder().insert()
      .into(Entity).values(data.slice(i, i + chunkSize))
      .orIgnore().execute();
  }
}
```

## Migration workflow

```bash
# 1. Auto-generate from entity changes
npx typeorm migration:generate src/migrations/AddIndex -d src/common/database/data-source.ts

# 2. Review the generated SQL!

# 3. Run
npx typeorm migration:run -d src/common/database/data-source.ts

# 4. Revert if needed
npx typeorm migration:revert -d src/common/database/data-source.ts
```

For materialized views, create empty migration and write SQL manually:

```typescript
export class CreateCompStatsView implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`CREATE MATERIALIZED VIEW mv_comp_stats AS ...`);
    await qr.query(`CREATE UNIQUE INDEX idx_mv_comp_stats ON mv_comp_stats (...)`);
  }
  async down(qr: QueryRunner) {
    await qr.query(`DROP MATERIALIZED VIEW IF EXISTS mv_comp_stats`);
  }
}
```

## Key indexes

```sql
-- Time-range queries on matches
CREATE INDEX idx_matches_datetime ON matches (game_datetime DESC, game_version);

-- Player match lookup
CREATE INDEX idx_participants_puuid ON participants (puuid, match_id DESC);

-- Active traits for comp detection
CREATE INDEX idx_traits_active ON participant_traits (match_id, puuid) WHERE style > 0;

-- Ranked matches only
CREATE INDEX idx_matches_ranked ON matches (game_version, game_datetime DESC) WHERE queue_id = 1100;
```

## Performance tips

- Use materialized views for dashboard queries (see `resources/materialized-views.md`)
- Batch inserts in chunks of 500
- Always `EXPLAIN ANALYZE` queries taking >100ms
- Use partial indexes (`WHERE queue_id = 1100`) for filtered queries
- Refresh views with `CONCURRENTLY` to allow reads during refresh

## Additional resources

See `resources/entities.md` for all Tactix entity definitions and ER diagram.
See `resources/materialized-views.md` for all analytics views with refresh strategies.
See `resources/query-patterns.md` for optimized query patterns.
