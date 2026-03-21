# PBE Day 1 Runbook — Set 17: Cosmos

Step-by-step protocol for switching Tactix to PBE data collection when a new TFT set lands on PBE.

---

## 1. Pre-flight Checklist

Verify the following before switching modes:

| Check                    | Command / Action                                                  |
| ------------------------ | ----------------------------------------------------------------- |
| API is healthy           | `curl http://localhost:5500/api/health` returns 200               |
| PostgreSQL is up         | `docker exec tactix-postgres pg_isready`                          |
| Redis is up              | `docker exec tactix-redis redis-cli ping` → `PONG`                |
| Worker container running | `docker ps \| grep tactix-worker` shows healthy                   |
| `RIOT_API_KEY` is valid  | Confirm key is not expired in `.env.production`                   |
| `ADMIN_API_KEY` is set   | Needed for all admin endpoints below                              |
| PBE is online            | Check [Riot PBE status](https://status.riotgames.com/?region=pbe) |

All admin endpoints require the header:

```
x-admin-key: <ADMIN_API_KEY>
```

---

## 2. Switch Collector to PBE Mode

```bash
curl -X POST http://localhost:5500/api/data-collector/switch-mode \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"mode": "pbe"}'
```

Expected response:

```json
{
  "success": true,
  "previous_mode": "live",
  "current_mode": "pbe"
}
```

Verify current mode:

```bash
curl http://localhost:5500/api/data-collector/mode \
  -H "x-admin-key: $ADMIN_API_KEY"
```

This is a runtime switch — no redeployment required. The scheduler will begin collecting from `pbe1.api.riotgames.com` on its next 30-minute cron tick.

---

## 3. Bootstrap Set 17 Static Data

Load champion, trait, item, and augment metadata from Community Dragon PBE:

```bash
curl -X POST "http://localhost:5500/api/metadata/bootstrap?set=17&env=pbe" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

Expected response:

```json
{
  "success": true,
  "message": "Bootstrapped metadata for Set 17 from Community Dragon (pbe)",
  "stats": {
    "champions": 60,
    "traits": 28,
    "items": 50,
    "augments": 120
  }
}
```

If counts look wrong (e.g., 0 champions), Community Dragon may not have published PBE data yet. Retry after CDragon updates.

---

## 4. Verify Data is Flowing

### 4a. Trigger a manual collection cycle

```bash
# Collect player lists from PBE ranked ladder
curl -X POST http://localhost:5500/api/data-collector/collect-players \
  -H "x-admin-key: $ADMIN_API_KEY"

# Collect matches for known players
curl -X POST http://localhost:5500/api/data-collector/collect-matches \
  -H "x-admin-key: $ADMIN_API_KEY"
```

### 4b. Check match data exists

```bash
# Verify patches endpoint returns a PBE patch version
curl http://localhost:5500/api/analytics/patches
```

If `patches` array is empty, PBE ranked queue may not be active yet. Wait for players to complete games.

### 4c. Check metadata is served

```bash
curl http://localhost:5500/api/metadata/champions | head -c 200
curl http://localhost:5500/api/metadata/traits | head -c 200
```

---

## 5. Monitor Meta Radar First Output

Once enough matches are collected (target: 500+ for initial signal):

```bash
# Check meta endpoint for PBE patch
curl "http://localhost:5500/api/analytics/meta?limit=10"

# Check tier list
curl "http://localhost:5500/api/analytics/tier-list"

# Check trend snapshot
curl "http://localhost:5500/api/analytics/trend/snapshot"
```

If analytics return empty or errors about "No patch found", data collection needs more time. The cron runs every 30 minutes — wait 1-2 cycles.

---

## 6. Rollback — Switch Back to Live Mode

If PBE is down or you need to revert:

```bash
curl -X POST http://localhost:5500/api/data-collector/switch-mode \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"mode": "live"}'
```

To also revert metadata to the current live set:

```bash
curl -X POST "http://localhost:5500/api/metadata/refresh" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

This reloads metadata from Community Dragon `latest` environment (live data).

---

## Troubleshooting

| Symptom                             | Cause                             | Fix                                                                    |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `collect-players` returns 0 players | PBE ranked ladder empty           | Wait for PBE to populate; only Challenger/GM/Master are collected      |
| Bootstrap returns 0 champions       | CDragon hasn't published PBE data | Retry later; check `raw.communitydragon.org/pbe/` manually             |
| Analytics return "No patch found"   | No matches ingested yet           | Run manual `collect-matches`, wait for cron cycles                     |
| Rate limit errors (429)             | API key limits hit                | Dev key: 20 req/s, 100 req/2min. Reduce collection concurrency or wait |
| Worker not processing jobs          | `APP_MODE` not set to `worker`    | Verify `docker-compose.prod.yml` worker env: `APP_MODE=worker`         |
