# Load Test Results: 3x Collector Volume

## Test Configuration

| Parameter | Value |
|---|---|
| Multiplier | 3x normal volume |
| Normal rate | ~35 matches/min/region |
| Target rate | ~105 matches/min/region |
| Regions | 9 (NA, EUW, KR, EUNE, BR, JP, OCE, TR, VN) |
| Total target throughput | ~945 jobs/min |
| Duration | 300s (5 minutes) |
| Total jobs enqueued | ~4,725 |

## How to Run

```bash
# Default: 3x volume, 5 minute duration
nx run api:load-test

# Custom settings
LOAD_TEST_DURATION_SEC=600 LOAD_TEST_MULTIPLIER=5 nx run api:load-test
```

### Prerequisites

- Redis running (configure via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- PostgreSQL running
- API server running (`nx serve api`) — processors must be active to drain queues

## Pass/Fail Criteria

| Check | Threshold | Description |
|---|---|---|
| Queue depth | < 5,000 | Peak match-collection queue depth must stay below 5K |
| Error rate | < 2% | Failed jobs must be under 2% of total |
| P95 latency | < 30,000ms | 95th percentile job completion time |

## Metrics Collected

- **Throughput**: completed matches/min
- **Queue depth over time**: sampled every 5s for both `match-collection` and `etl-pipeline` queues
- **Error rate**: failed / total jobs
- **P95 latency**: 95th percentile of job enqueue-to-completion time
- **Redis memory**: peak memory usage during test

## Results

> **Status: PENDING** — Run `nx run api:load-test` with the API server active and paste results below.

```
(paste test output here after running)
```

## Verdict

- [ ] PASS — system sustains 3x volume
- [ ] FAIL — identify bottleneck and remediate

## Bottleneck Analysis (if FAIL)

If the test fails, check these in order:

1. **BullMQ queue backup** → Increase worker concurrency in `DataCollectorProcessor` (currently 5)
2. **Redis memory spike** → Check `removeOnComplete`/`removeOnFail` job retention settings
3. **PostgreSQL connection exhaustion** → Increase `max` in TypeORM connection pool config
4. **ETL processor lag** → Scale ETL concurrency or add batch processing
5. **Riot API rate limits** → The limiter is set to 15 req/s; production key allows higher
