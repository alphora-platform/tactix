# Environment Variables Reference

Derived from `apps/api/src/modules/config/config.schema.ts` and `docker/docker-compose.prod.yml`.

## Application

| Variable   | Type     | Required | Default       | Description                                                                                                                                                                                |
| ---------- | -------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV` | `string` | No       | `development` | `development`, `production`, or `test`                                                                                                                                                     |
| `PORT`     | `number` | No       | `3000`        | HTTP server listen port                                                                                                                                                                    |
| `APP_MODE` | `string` | No       | `api`         | `api` (serve HTTP), `worker` (BullMQ processors + cron), or `migrate` (run DB migrations and exit). Read directly via `process.env` in `main.ts` — not validated by the Joi config schema. |

## Riot API

| Variable                   | Type     | Required | Default | Description                                                              |
| -------------------------- | -------- | -------- | ------- | ------------------------------------------------------------------------ |
| `RIOT_API_KEY`             | `string` | **Yes**  | —       | Riot API key. Dev: 20 req/s, 100/2min. Production key has higher limits. |
| `RIOT_RATE_LIMIT_PER_SEC`  | `number` | No       | `20`    | Max requests per second to Riot API                                      |
| `RIOT_RATE_LIMIT_PER_2MIN` | `number` | No       | `100`   | Max requests per 2-minute window                                         |

## Riot OAuth (RSO)

| Variable             | Type     | Required | Default | Description                                                      |
| -------------------- | -------- | -------- | ------- | ---------------------------------------------------------------- |
| `RIOT_CLIENT_ID`     | `string` | No       | —       | OAuth client ID for Riot Sign-On                                 |
| `RIOT_CLIENT_SECRET` | `string` | No       | —       | OAuth client secret                                              |
| `RIOT_REDIRECT_URI`  | `string` | No       | —       | OAuth callback URI registered with Riot                          |
| `FRONTEND_URL`       | `string` | No       | —       | Frontend base URL for OAuth redirect (e.g., `https://tactix.gg`) |

## Data Collector

| Variable               | Type     | Required | Default  | Description                                                                                                                |
| ---------------------- | -------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `COLLECTOR_MODE`       | `string` | No       | `live`   | `live` or `pbe`. Determines which regions are collected. Can be changed at runtime via `POST /data-collector/switch-mode`. |
| `COMMUNITY_DRAGON_ENV` | `string` | No       | `latest` | `latest` (live) or `pbe`. Controls which Community Dragon environment is used for static metadata.                         |

## Redis

| Variable     | Type     | Required | Default     | Description           |
| ------------ | -------- | -------- | ----------- | --------------------- |
| `REDIS_HOST` | `string` | No       | `localhost` | Redis server hostname |
| `REDIS_PORT` | `number` | No       | `6379`      | Redis server port     |

## Authentication

| Variable         | Type     | Required | Default | Description                                                           |
| ---------------- | -------- | -------- | ------- | --------------------------------------------------------------------- |
| `JWT_SECRET`     | `string` | **Yes**  | —       | Secret key for signing JWT tokens                                     |
| `JWT_EXPIRES_IN` | `string` | No       | `7d`    | JWT token expiration (e.g., `7d`, `24h`)                              |
| `ADMIN_API_KEY`  | `string` | **Yes**  | —       | API key for admin-only endpoints (data-collector, metadata bootstrap) |

## Docker / Infrastructure

These are used in `docker-compose.prod.yml` but not validated by the NestJS config schema:

| Variable        | Type     | Required | Default    | Description                           |
| --------------- | -------- | -------- | ---------- | ------------------------------------- |
| `POSTGRES_USER` | `string` | No       | `postgres` | PostgreSQL username                   |
| `POSTGRES_DB`   | `string` | No       | `tactix`   | PostgreSQL database name              |
| `GITHUB_OWNER`  | `string` | No       | —          | GitHub org/user for GHCR image paths  |
| `GITHUB_REPO`   | `string` | No       | —          | GitHub repo name for GHCR image paths |
| `IMAGE_TAG`     | `string` | No       | `latest`   | Docker image tag for deployment       |
