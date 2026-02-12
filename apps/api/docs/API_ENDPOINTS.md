# Tactix API — Data Collector Endpoints

Base URL: `http://localhost:5500/api`

---

## POST `/data-collector/collect-players`

Fetch Challenger, Grandmaster, and Master player lists from 4 regions (NA, EUW, KR, OCE) and upsert into the `players` table.

### Request

```bash
curl -X POST http://localhost:5500/api/data-collector/collect-players
```

### Response

```json
{
  "regions": [
    {
      "region": "NA",
      "challenger": 200,
      "grandmaster": 500,
      "master": 1200,
      "total": 1900
    },
    {
      "region": "EUW",
      "challenger": 300,
      "grandmaster": 700,
      "master": 2000,
      "total": 3000
    },
    {
      "region": "KR",
      "challenger": 300,
      "grandmaster": 700,
      "master": 2500,
      "total": 3500
    },
    {
      "region": "OCE",
      "challenger": 50,
      "grandmaster": 100,
      "master": 300,
      "total": 450
    }
  ],
  "totalPlayers": 8850,
  "durationMs": 12340
}
```

### Behavior

- Calls Riot API league endpoints (platform routing: `na1`, `euw1`, `kr`, `oc1`)
- Fetches 3 tiers per region: `/tft/league/v1/challenger`, `/grandmaster`, `/master`
- Upserts players using `orUpdate` on conflict — updates `tier`, `lp`, `wins`, `losses`, `updated_at`
- Regions are processed sequentially; tiers within a region are fetched in parallel
- Rate limited: 20 req/s, 100 req/2min (Riot dev key limits)

### Error cases

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| `403`  | Riot API key is invalid or expired (dev keys expire every 24h) |
| `429`  | Riot API rate limit exceeded                                   |
| `503`  | Riot API is temporarily unavailable                            |

---

## POST `/data-collector/collect-matches`

Fetch match histories for players already stored in the database, parse match details, and save match data (participants, units, traits, augments) with dedup logic.

### Request

```bash
curl -X POST http://localhost:5500/api/data-collector/collect-matches
```

### Response

```json
{
  "playersProcessed": 200,
  "totalNewMatchIds": 1500,
  "totalMatchesSaved": 1200,
  "totalSkipped": 250,
  "totalErrors": 50,
  "durationMs": 180000,
  "playerResults": [
    {
      "puuid": "abc123...",
      "region": "NA",
      "matchIdsFetched": 20,
      "newMatches": 15,
      "matchesSaved": 12,
      "skipped": 3,
      "errors": 0
    }
  ]
}
```

### Behavior

1. **Player selection**: Queries players from DB per region, ordered by `lastFetchAt ASC NULLS FIRST` (prioritizes never-fetched players). Default: 50 players per region.
2. **Incremental fetch**: Uses `player.lastFetchAt` as `startTime` parameter — only fetches matches played since the last collection.
3. **Match ID dedup**: Checks existing `matches` table before fetching details — skips already-collected match IDs.
4. **Match detail**: Fetches full match data via regional routing (`americas`, `europe`, `asia`, `sea`).
5. **Parsing**: `MatchParser` transforms raw Riot JSON into Tactix entities:
   - Skips non-ranked matches (`queue_id !== 1100`)
   - Validates participant data (placement 1–8, level 1–11)
   - Only stores active traits (`style > 0`)
   - Extracts patch version from `game_version` (e.g., `"Version 14.3.610.1234"` → `"14.3"`)
6. **Database save**:
   - Match: `INSERT ... ON CONFLICT DO NOTHING` (immutable)
   - Participants: individual save with FK to match
   - Units/Traits/Augments: batch save with FK to participant
7. **Updates `player.lastFetchAt`** after processing each player.

### Response fields explanation

| Field               | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `playersProcessed`  | Total number of players whose match history was checked |
| `totalNewMatchIds`  | Match IDs fetched that were not yet in the database     |
| `totalMatchesSaved` | Matches successfully parsed and saved (ranked only)     |
| `totalSkipped`      | Matches skipped (non-ranked or invalid data)            |
| `totalErrors`       | Matches that failed during fetch or save                |

### Error cases

Same as `collect-players`, plus:

| Status | Cause                                         |
| ------ | --------------------------------------------- |
| `404`  | Match not found (expired or invalid match ID) |

---

## Usage Flow

```bash
# Step 1: Collect top players from all regions
curl -X POST http://localhost:5500/api/data-collector/collect-players

# Step 2: Fetch their recent match histories
curl -X POST http://localhost:5500/api/data-collector/collect-matches

# Repeat Step 1 + 2 periodically (every 30 min) to keep data fresh
```

> ⚠️ **Riot Dev Key**: Expires every 24h. Regenerate at [developer.riotgames.com](https://developer.riotgames.com). Set `RIOT_API_KEY` in `apps/api/.env`.

---

## Database Tables Affected

| Table                  | Action                            | Endpoint          |
| ---------------------- | --------------------------------- | ----------------- |
| `players`              | Upsert (insert or update LP/tier) | `collect-players` |
| `matches`              | Insert (skip on conflict)         | `collect-matches` |
| `participants`         | Insert (dedup by matchId + puuid) | `collect-matches` |
| `participant_units`    | Insert                            | `collect-matches` |
| `participant_traits`   | Insert (active traits only)       | `collect-matches` |
| `participant_augments` | Insert                            | `collect-matches` |
