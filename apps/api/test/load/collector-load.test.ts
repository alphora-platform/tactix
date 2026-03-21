/**
 * Load test: simulates 3x normal data collector volume.
 *
 * Normal volume:  ~50K matches/day across 9 live regions = ~35 matches/min/region
 * 3x target:      ~105 matches/min/region, 9 regions = ~945 concurrent jobs
 *
 * What this test does:
 *   1. Connects directly to Redis + BullMQ (same queues the app uses).
 *   2. Enqueues collect-player-matches jobs at 3x rate for all live regions.
 *   3. Monitors queue depth, throughput, error rate, and p95 latency.
 *   4. Runs for a configurable duration (default: 5 minutes).
 *   5. Prints a summary with pass/fail verdict.
 *
 * Prerequisites:
 *   - Redis running (REDIS_HOST / REDIS_PORT env vars or defaults to localhost:6379)
 *   - PostgreSQL running (the ETL processor needs it)
 *   - The API server running (processors must be active to drain the queues)
 *
 * Usage:
 *   nx run api:load-test
 *   LOAD_TEST_DURATION_SEC=300 LOAD_TEST_MULTIPLIER=3 nx run api:load-test
 */

import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// ── Configuration ──────────────────────────────────────────────────────────

const REDIS_HOST = process.env['REDIS_HOST'] ?? 'localhost';
const REDIS_PORT = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
const REDIS_PASSWORD = process.env['REDIS_PASSWORD'] ?? undefined;

const DURATION_SEC = parseInt(process.env['LOAD_TEST_DURATION_SEC'] ?? '300', 10);
const MULTIPLIER = parseInt(process.env['LOAD_TEST_MULTIPLIER'] ?? '3', 10);

/** Normal rate: ~35 matches/min per region. */
const NORMAL_RATE_PER_REGION = 35;
const TARGET_RATE_PER_REGION = NORMAL_RATE_PER_REGION * MULTIPLIER;

const REGIONS = ['NA', 'EUW', 'KR', 'EUNE', 'BR', 'JP', 'OCE', 'TR', 'VN'];

const QUEUE_MATCH_COLLECTION = 'match-collection';
const QUEUE_ETL_PIPELINE = 'etl-pipeline';

// ── Thresholds (pass/fail criteria) ────────────────────────────────────────

/** Max acceptable queue depth before we consider the system backed up. */
const MAX_QUEUE_DEPTH = 5_000;

/** Max acceptable error rate (fraction). */
const MAX_ERROR_RATE = 0.02;

/** Max acceptable p95 latency per job in ms. */
const MAX_P95_LATENCY_MS = 30_000;

// ── Types ──────────────────────────────────────────────────────────────────

interface Snapshot {
  timestamp: number;
  matchQueueDepth: number;
  etlQueueDepth: number;
  redisMemoryBytes: number;
}

interface JobResult {
  completedAt: number;
  enqueuedAt: number;
  failed: boolean;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  Tactix Collector Load Test');
  console.log(`  Target: ${MULTIPLIER}x normal volume (${TARGET_RATE_PER_REGION} matches/min/region)`);
  console.log(`  Duration: ${DURATION_SEC}s | Regions: ${REGIONS.length}`);
  console.log('='.repeat(70));

  const connection = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  await connection.connect();
  console.log(`[+] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

  const matchQueue = new Queue(QUEUE_MATCH_COLLECTION, { connection });
  const etlQueue = new Queue(QUEUE_ETL_PIPELINE, { connection });
  const matchQueueEvents = new QueueEvents(QUEUE_MATCH_COLLECTION, { connection });

  const snapshots: Snapshot[] = [];
  const jobResults: JobResult[] = [];
  const jobEnqueueTimes = new Map<string, number>();

  // Track completed/failed jobs via QueueEvents
  matchQueueEvents.on('completed', ({ jobId }) => {
    const enqueuedAt = jobEnqueueTimes.get(jobId);
    if (enqueuedAt) {
      jobResults.push({ completedAt: Date.now(), enqueuedAt, failed: false });
      jobEnqueueTimes.delete(jobId);
    }
  });

  matchQueueEvents.on('failed', ({ jobId }) => {
    const enqueuedAt = jobEnqueueTimes.get(jobId);
    if (enqueuedAt) {
      jobResults.push({ completedAt: Date.now(), enqueuedAt, failed: true });
      jobEnqueueTimes.delete(jobId);
    }
  });

  // ── Snapshot poller (every 5s) ─────────────────────────────────────────

  const snapshotInterval = setInterval(async () => {
    try {
      const [matchDepth, etlDepth, redisInfo] = await Promise.all([
        matchQueue.count(),
        etlQueue.count(),
        connection.info('memory'),
      ]);

      const memMatch = redisInfo.match(/used_memory:(\d+)/);
      const redisMemoryBytes = memMatch ? parseInt(memMatch[1], 10) : 0;

      const snap: Snapshot = {
        timestamp: Date.now(),
        matchQueueDepth: matchDepth,
        etlQueueDepth: etlDepth,
        redisMemoryBytes,
      };
      snapshots.push(snap);

      const memMb = (redisMemoryBytes / 1024 / 1024).toFixed(1);
      console.log(
        `  [${new Date().toISOString()}] match_q=${matchDepth} etl_q=${etlDepth} redis_mem=${memMb}MB`
      );
    } catch {
      // ignore snapshot errors
    }
  }, 5_000);

  // ── Enqueue jobs at 3x rate ────────────────────────────────────────────

  const totalJobsPerRegion = Math.ceil((TARGET_RATE_PER_REGION * DURATION_SEC) / 60);
  const intervalMsBetweenJobs = (60 * 1000) / TARGET_RATE_PER_REGION;
  const totalJobs = totalJobsPerRegion * REGIONS.length;

  console.log(`\n[+] Enqueuing ${totalJobs} jobs (${totalJobsPerRegion}/region) over ${DURATION_SEC}s`);
  console.log(`    Interval: ${intervalMsBetweenJobs.toFixed(0)}ms between jobs per region\n`);

  const startTime = Date.now();
  let enqueuedCount = 0;

  // Stagger enqueuing: one batch per region per interval tick
  const enqueuePromise = new Promise<void>((resolve) => {
    let tick = 0;

    const timer = setInterval(async () => {
      if (tick >= totalJobsPerRegion) {
        clearInterval(timer);
        resolve();
        return;
      }

      const batchId = Date.now();
      const jobs = REGIONS.map((region, idx) => {
        const jobId = `load-test-${region}-${batchId}-${tick}-${idx}`;
        jobEnqueueTimes.set(jobId, Date.now());
        return {
          name: 'collect-player-matches',
          data: {
            puuid: `load-test-${region}-${tick}`,
            region,
            startTime: Math.floor(Date.now() / 1000) - 3600,
          },
          opts: {
            jobId,
            priority: 10, // Lower priority than real jobs
            attempts: 1,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 },
          },
        };
      });

      try {
        await matchQueue.addBulk(jobs);
        enqueuedCount += jobs.length;
      } catch (err) {
        console.error(`  [!] Bulk enqueue error: ${(err as Error).message}`);
      }

      tick++;
    }, intervalMsBetweenJobs);
  });

  await enqueuePromise;

  // Wait for remaining jobs to drain (up to 60s extra)
  console.log(`\n[+] All jobs enqueued (${enqueuedCount}). Waiting up to 60s for drain...`);

  const drainDeadline = Date.now() + 60_000;
  while (Date.now() < drainDeadline) {
    const depth = await matchQueue.count();
    if (depth === 0) break;
    await sleep(2_000);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  clearInterval(snapshotInterval);
  await matchQueueEvents.close();
  await matchQueue.close();
  await etlQueue.close();
  await connection.quit();

  // ── Report ──────────────────────────────────────────────────────────────

  const elapsedSec = (Date.now() - startTime) / 1000;
  const completed = jobResults.filter((j) => !j.failed).length;
  const failed = jobResults.filter((j) => j.failed).length;
  const total = completed + failed;
  const errorRate = total > 0 ? failed / total : 0;
  const throughput = total > 0 ? (completed / elapsedSec) * 60 : 0;

  // P95 latency
  const latencies = jobResults
    .filter((j) => !j.failed)
    .map((j) => j.completedAt - j.enqueuedAt)
    .sort((a, b) => a - b);

  const p95Latency = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.95)]
    : 0;

  const peakQueueDepth = Math.max(...snapshots.map((s) => s.matchQueueDepth), 0);
  const peakRedisMemMb = Math.max(...snapshots.map((s) => s.redisMemoryBytes), 0) / 1024 / 1024;

  console.log('\n' + '='.repeat(70));
  console.log('  LOAD TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`  Duration:            ${elapsedSec.toFixed(1)}s`);
  console.log(`  Jobs enqueued:       ${enqueuedCount}`);
  console.log(`  Jobs completed:      ${completed}`);
  console.log(`  Jobs failed:         ${failed}`);
  console.log(`  Throughput:          ${throughput.toFixed(1)} matches/min`);
  console.log(`  Error rate:          ${(errorRate * 100).toFixed(2)}%`);
  console.log(`  P95 latency:         ${p95Latency}ms`);
  console.log(`  Peak queue depth:    ${peakQueueDepth}`);
  console.log(`  Peak Redis memory:   ${peakRedisMemMb.toFixed(1)}MB`);
  console.log('');

  // ── Verdict ─────────────────────────────────────────────────────────────

  const checks = [
    { name: 'Queue depth', pass: peakQueueDepth < MAX_QUEUE_DEPTH, actual: peakQueueDepth, max: MAX_QUEUE_DEPTH },
    { name: 'Error rate', pass: errorRate <= MAX_ERROR_RATE, actual: `${(errorRate * 100).toFixed(2)}%`, max: `${MAX_ERROR_RATE * 100}%` },
    { name: 'P95 latency', pass: p95Latency <= MAX_P95_LATENCY_MS, actual: `${p95Latency}ms`, max: `${MAX_P95_LATENCY_MS}ms` },
  ];

  console.log('  CHECKS:');
  for (const check of checks) {
    const status = check.pass ? 'PASS' : 'FAIL';
    console.log(`    [${status}] ${check.name}: ${check.actual} (max: ${check.max})`);
  }

  const allPassed = checks.every((c) => c.pass);
  console.log('');
  console.log(`  VERDICT: ${allPassed ? 'PASS' : 'FAIL'} — ${MULTIPLIER}x volume ${allPassed ? 'sustained' : 'NOT sustained'}`);
  console.log('='.repeat(70));

  // ── Queue depth over time (summary) ─────────────────────────────────────

  if (snapshots.length > 0) {
    console.log('\n  QUEUE DEPTH OVER TIME (match-collection):');
    const step = Math.max(1, Math.floor(snapshots.length / 20));
    for (let i = 0; i < snapshots.length; i += step) {
      const s = snapshots[i];
      const elapsed = ((s.timestamp - startTime) / 1000).toFixed(0);
      const bar = '#'.repeat(Math.min(50, Math.floor(s.matchQueueDepth / 100)));
      console.log(`    ${elapsed.padStart(5)}s | ${String(s.matchQueueDepth).padStart(5)} ${bar}`);
    }
  }

  process.exit(allPassed ? 0 : 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(2);
});
