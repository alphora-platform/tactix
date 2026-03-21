# Tactix Architecture

## Data Flow

```
┌──────────────┐     ┌──────────────────────────────────────────────────────┐
│  Riot API     │     │  Tactix Backend (NestJS)                            │
│  (TFT Match   │────▶│                                                     │
│   & League)   │     │  ┌─────────────────┐    ┌────────────────────────┐  │
└──────────────┘     │  │  Data Collector  │───▶│  PostgreSQL            │  │
                      │  │  (BullMQ Worker) │    │  ┌──────────────────┐  │  │
┌──────────────┐     │  └─────────────────┘    │  │ Raw tables:      │  │  │
│  Community    │     │           │              │  │  players         │  │  │
│  Dragon      │────▶│  ┌────────▼────────┐    │  │  matches         │  │  │
│  (Static Data)│     │  │  Metadata Cache  │    │  │  participants    │  │  │
└──────────────┘     │  │  (Redis)         │    │  │  units/traits/   │  │  │
                      │  └─────────────────┘    │  │  augments        │  │  │
                      │                          │  ├──────────────────┤  │  │
                      │  ┌─────────────────┐    │  │ Materialized     │  │  │
                      │  │  Analytics       │◀───│  │ views:           │  │  │
                      │  │  (Meta Radar,    │    │  │  mv_comp_stats   │  │  │
                      │  │   Tier List,     │    │  │  mv_comp_trend   │  │  │
                      │  │   Trends,        │    │  │  mv_item_combo   │  │  │
                      │  │   Regions,       │    │  │  mv_augment_stats│  │  │
                      │  │   Playbook)      │    │  └──────────────────┘  │  │
                      │  └────────┬────────┘    └────────────────────────┘  │
                      │           │                                         │
                      │  ┌────────▼────────┐    ┌────────────────────────┐  │
                      │  │  REST API        │    │  Redis                 │  │
                      │  │  (Controllers)   │───▶│  (Cache + BullMQ       │  │
                      │  └────────┬────────┘    │   job queues)          │  │
                      └───────────┼─────────────└────────────────────────┘──┘
                                  │
                      ┌───────────▼─────────────────────────────────────────┐
                      │  React Frontend                                     │
                      │  (Meta Overview, Trends, Regions, Playbook,         │
                      │   Player Tracker, Match Detail)                     │
                      └─────────────────────────────────────────────────────┘
```

## Module Responsibilities

| Module | Description |
|--------|-------------|
| **config** | Validates environment variables via Joi schema. Provides `ConfigService` to all modules. |
| **riot-api** | HTTP client for Riot API with built-in rate limiting (token bucket). Handles platform vs. regional routing. |
| **data-collector** | Cron-driven pipeline that collects player lists and match data from Riot API. Uses BullMQ for job queuing. Supports `live` and `pbe` modes. |
| **metadata** | Loads and caches TFT static data (champions, traits, items, augments) from Community Dragon. Supports PBE and live environments. |
| **database** | TypeORM entities, migrations, and connection config. PostgreSQL 16. |
| **analytics** | Core analysis engine: meta stats, tier classification (S/A/B/C), trend analysis, comp deep-dives, region comparison, and playbook generation. |
| **tracker** | Personal performance tracking: placement distribution, comp proficiency, econ curves, item efficiency, tilt detection, weekly reports. |
| **patch-analyzer** | Detects patch changes and predicts meta shifts based on historical data. |
| **alerts** | Scheduled checks for meta shifts, new comps, patch drops, and hotfixes. Sends notifications via Discord/Telegram. |
| **auth** | Riot OAuth (RSO) login flow. Issues JWT tokens for authenticated player tracking. |
| **raw-data** | Direct lookup endpoints for player and match data (by name, PUUID, or match ID). |

## APP_MODE

The same Docker image runs in different modes controlled by `APP_MODE`:

| Mode | What runs | When to use |
|------|-----------|-------------|
| `api` (default) | REST controllers, health checks, auth endpoints | The HTTP-serving container. Handles all inbound requests. |
| `worker` | BullMQ processors, cron scheduler, alert checks | Background processing. Runs data collection, ETL, and alert jobs. Does not serve HTTP. |
| `migrate` | Runs pending TypeORM migrations then exits | Pre-deployment step in CI/CD pipelines. Run before starting `api` or `worker` containers. |

In production, these run as separate containers (`tactix-api` and `tactix-worker`) from the same image. See `docker/docker-compose.prod.yml`.

## Production Stack

| Component | Image | Purpose |
|-----------|-------|---------|
| `tactix-api` | `api:latest` | NestJS API server (`APP_MODE=api`) |
| `tactix-worker` | `api:latest` | BullMQ worker (`APP_MODE=worker`) |
| `tactix-postgres` | `postgres:16-alpine` | Primary database |
| `tactix-redis` | `redis:7-alpine` | Cache + job queues (256MB, allkeys-lru) |
| `tactix-frontend` | `frontend:latest` | React SPA served via nginx |
| `tactix-nginx` | `nginx:1.27-alpine` | Reverse proxy, SSL termination |
