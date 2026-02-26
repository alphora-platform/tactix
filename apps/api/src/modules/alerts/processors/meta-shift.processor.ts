import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { NotificationService } from '../notification.service';
import { CompDetectionService } from '../../analytics/comp-detection.service';
import type { AlertPayload } from '../interfaces/alert.interfaces';
import {
  ALERT_QUEUE_NAME,
  ALERT_JOB_NAMES,
  ALERTS_REDIS_CLIENT,
  META_SNAPSHOT_CACHE_KEY,
  META_SNAPSHOT_TTL_SECONDS,
  META_SHIFT_PLAYRATE_THRESHOLD,
  META_SHIFT_WINRATE_THRESHOLD,
} from '../constants/alerts.constants';

// ── Snapshot shape ─────────────────────────────────────────────────────────

interface CompSnapshot {
  comp_id: string;
  label: string;
  win_rate: number;
  play_rate: number; // fraction of total games this comp appeared in
  sample_size: number;
}

// ── DB query row ──────────────────────────────────────────────────────────

interface MvCompRow {
  comp_id: string;
  trait_combo: string[];
  win_rate: string;
  sample_size: string;
  patch: string;
}

interface TotalGamesRow {
  total: string;
}

/**
 * Processes `check-meta-shift` jobs.
 *
 * Algorithm:
 *  1. Fetch current comp stats from mv_comp_stats for the latest patch.
 *  2. Load the 12h-ago snapshot from Redis. If absent → save current as baseline.
 *  3. For each comp in the current snapshot, compute win_rate and play_rate deltas.
 *  4. Alert if |play_rate delta| > META_SHIFT_PLAYRATE_THRESHOLD
 *        OR |win_rate delta| > META_SHIFT_WINRATE_THRESHOLD.
 *  5. Save current snapshot back to Redis (TTL = 13h).
 *
 * Alerts are fire-and-forget (attempts: 1). The next hourly cron will retry.
 */
@Processor(ALERT_QUEUE_NAME, { concurrency: 1 })
export class MetaShiftProcessor extends WorkerHost {
  private readonly logger = new Logger(MetaShiftProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notification: NotificationService,
    private readonly compDetection: CompDetectionService,
    @Inject(ALERTS_REDIS_CLIENT) private readonly redis: Redis
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== ALERT_JOB_NAMES.CHECK_META_SHIFT) return;

    this.logger.debug(`[MetaShift] Processing job ${job.id}`);

    // ── Step 1: Fetch current patch + comp stats ─────────────────────────
    const patchRow = await this.dataSource.query<{ patch: string }[]>(
      `SELECT patch FROM mv_comp_stats ORDER BY sample_size DESC LIMIT 1`
    );
    const currentPatch = patchRow[0]?.patch;
    if (!currentPatch) {
      this.logger.warn('[MetaShift] No patch found in mv_comp_stats — skipping');
      return { skipped: true };
    }

    const [compRows, totalRows] = await Promise.all([
      this.dataSource.query<MvCompRow[]>(
        `SELECT comp_id, trait_combo, win_rate::text, sample_size::text, patch
         FROM mv_comp_stats WHERE patch = $1`,
        [currentPatch]
      ),
      this.dataSource.query<TotalGamesRow[]>(
        `SELECT SUM(sample_size)::text AS total FROM mv_comp_stats WHERE patch = $1`,
        [currentPatch]
      ),
    ]);

    const totalGames = parseInt(totalRows[0]?.total ?? '1', 10) || 1;
    const currentSnapshot: CompSnapshot[] = compRows.map((r) => ({
      comp_id: r.comp_id,
      label: this.compDetection.getCompLabel(r.trait_combo),
      win_rate: parseFloat(r.win_rate),
      play_rate: parseInt(r.sample_size, 10) / totalGames,
      sample_size: parseInt(r.sample_size, 10),
    }));

    // ── Step 2: Load previous snapshot ───────────────────────────────────
    const cacheKey = `${META_SNAPSHOT_CACHE_KEY}:${currentPatch}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);

    if (!cached) {
      // No prior snapshot — save current as baseline and wait for next run.
      await this.redis
        .setex(cacheKey, META_SNAPSHOT_TTL_SECONDS, JSON.stringify(currentSnapshot))
        .catch((err: Error) => this.logger.warn(`[MetaShift] Redis write failed: ${err.message}`));
      this.logger.log('[MetaShift] No prior snapshot found — saved current as baseline');
      return { baseline_saved: true, comps: currentSnapshot.length };
    }

    const prevSnapshot: CompSnapshot[] = JSON.parse(cached) as CompSnapshot[];
    const prevMap = new Map(prevSnapshot.map((s) => [s.comp_id, s]));

    // ── Step 3–4: Detect shifts and fire alerts ───────────────────────────
    const alerts: AlertPayload[] = [];

    for (const current of currentSnapshot) {
      const prev = prevMap.get(current.comp_id);
      if (!prev) continue; // New comp — handled by new-comp processor

      const winRateDelta = current.win_rate - prev.win_rate;
      const playRateDelta = current.play_rate - prev.play_rate;

      const winRateShifted = Math.abs(winRateDelta) >= META_SHIFT_WINRATE_THRESHOLD;
      const playRateShifted = Math.abs(playRateDelta) >= META_SHIFT_PLAYRATE_THRESHOLD;

      if (!winRateShifted && !playRateShifted) continue;

      const direction = winRateDelta > 0 ? '📈 RISING' : '📉 FALLING';
      const type = winRateDelta > 0 ? 'META_SHIFT' : 'META_SHIFT';

      alerts.push({
        type,
        title: `${direction} — ${current.label}`,
        description: `Significant meta shift detected for **${current.label}** in patch ${currentPatch}.`,
        compId: current.comp_id,
        data: {
          patch: currentPatch,
          win_rate_before: `${(prev.win_rate * 100).toFixed(1)}%`,
          win_rate_after: `${(current.win_rate * 100).toFixed(1)}%`,
          win_rate_delta: `${winRateDelta >= 0 ? '+' : ''}${(winRateDelta * 100).toFixed(1)}%`,
          play_rate_before: `${(prev.play_rate * 100).toFixed(1)}%`,
          play_rate_after: `${(current.play_rate * 100).toFixed(1)}%`,
          play_rate_delta: `${playRateDelta >= 0 ? '+' : ''}${(playRateDelta * 100).toFixed(1)}%`,
          sample_size: current.sample_size,
        },
      });
    }

    // ── Step 5: Send alerts + refresh cache ───────────────────────────────
    await Promise.all(alerts.map((a) => this.notification.send(a)));

    await this.redis
      .setex(cacheKey, META_SNAPSHOT_TTL_SECONDS, JSON.stringify(currentSnapshot))
      .catch((err: Error) => this.logger.warn(`[MetaShift] Redis write failed: ${err.message}`));

    this.logger.log(
      `[MetaShift] Checked ${currentSnapshot.length} comps — ${alerts.length} alerts sent`
    );
    return { comps_checked: currentSnapshot.length, alerts_sent: alerts.length };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`[MetaShift] Job ${job.id} failed: ${err.message}`);
  }
}
