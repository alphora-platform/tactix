# Seed Set 17 Static Data Guide

## Local (Dev)

1. Make sure dev environment is running (Postgres must be up):

```bash
make dev-up
```

2. Rebuild the api image to include new code changes:

```bash
docker compose -f docker-compose.yml build api
```

3. Run the seed:

```bash
docker compose -f docker-compose.yml run --rm -e APP_MODE=seed-set17 api
```

4. Verify data was inserted:

```bash
docker compose -f docker-compose.yml exec postgres psql -U <your_db_user> -d <your_db_name> -c "SELECT count(*) FROM set17_champions; SELECT count(*) FROM set17_traits;"
```

Expected: 50 champions, 32 traits.

## Production (VPS)

```bash
make prod-seed-set17
```

This runs a one-off container using the production compose file, seeds the data, then exits.

## Notes

- The seed uses upsert (`ON CONFLICT` on `apiName`), so it is **idempotent** — safe to run multiple times.
- The script prints progress for each champion/trait. If it fails, check the logs output to see exactly where it broke.
