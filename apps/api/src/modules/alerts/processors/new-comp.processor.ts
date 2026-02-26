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
  NEW_COMP_WIN_RATE_FLOOR,
  NEW_COMP_MIN_SAMPLE,
} from '../constants/alerts.constants';

// ── DB row shapes ──────────────────────────────────────────────────────────

interface CurrentCompRow {
  comp_id: string;
  trait_combo: string[];
  win_rate: string;
  sample_size: string;
}

/**
 * Snapshotted state of a comp as written to Redis.
 * The `first_seen_at` field allows detecting brand-new comps.
 */
interface CompRecord {
  comp_id: string;
  label: string;
  first_seen_at: number; // Unix ms
  win_rate: number;
  sample_size: number;
}

/**
 * Processes `check-new-comp` jobs (scheduled every 6 hours).
 *
 * Algorithm:
 *  1. Fetch all comp_ids in current patch from mv_comp_stats.
 *  2. Load the comp-registry snapshot from Redis (same key base as meta-shift).
 *  3. Any comp NOT in the registry whose first_seen_at would be > 48h ago is "new".
 *  4. Alert for new comps where win_rate >= 55% AND sample_size >= 30.
 *  5. Merge new comps into the registry and persist.
 *
 * Shares the Redis key namespace with MetaShiftProcessor — each comp's
 * `first_seen_at` timestamp is appended to the existing snapshot entries.
 */
@Processor(ALERT_QUEUE_NAME, { concurrency: 1 })
export class NewCompProcessor extends WorkerHost {
  private readonly logger = new Logger(NewCompProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notification: NotificationService,
    private readonly compDetection: CompDetectionService,
    @Inject(ALERTS_REDIS_CLIENT) private readonly redis: Redis
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== ALERT_JOB_NAMES.CHECK_NEW_COMP) return;

    this.logger.debug(`[NewComp] Processing job ${job.id}`);

    // ── Step 1: Fetch current patch + comp stats ─────────────────────────
    const patchRow = await this.dataSource.query<{ patch: string }[]>(
      `SELECT patch FROM mv_comp_stats ORDER BY sample_size DESC LIMIT 1`
    );
    const currentPatch = patchRow[0]?.patch;
    if (!currentPatch) {
      this.logger.warn('[NewComp] No patch found — skipping');
      return { skipped: true };
    }

    const rows = await this.dataSource.query<CurrentCompRow[]>(
      `SELECT comp_id, trait_combo, win_rate::text, sample_size::text
       FROM mv_comp_stats WHERE patch = $1`,
      [currentPatch]
    );

    // ── Step 2: Load registry from Redis ─────────────────────────────────
    const cacheKey = `${META_SNAPSHOT_CACHE_KEY}:${currentPatch}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);

    // Build a map of known comp_ids from the registry.
    const registry = new Map<string, CompRecord>();
    if (cached) {
      const parsed = JSON.parse(cached) as CompRecord[];
      for (const rec of parsed) {
        if (rec.first_seen_at) registry.set(rec.comp_id, rec);
      }
    }

    const now = Date.now();
    const alerts: AlertPayload[] = [];
    const newRecords: CompRecord[] = [];

    // ── Steps 3–4: Find new comps and decide whether to alert ─────────────
    for (const row of rows) {
      const winRate = parseFloat(row.win_rate);
      const sampleSize = parseInt(row.sample_size, 10);
      const label = this.compDetection.getCompLabel(row.trait_combo);
      const existing = registry.get(row.comp_id);

      if (!existing) {
        // Brand new comp — record it.
        newRecords.push({
          comp_id: row.comp_id,
          label,
          first_seen_at: now,
          win_rate: winRate,
          sample_size: sampleSize,
        });

        if (winRate >= NEW_COMP_WIN_RATE_FLOOR && sampleSize >= NEW_COMP_MIN_SAMPLE) {
          alerts.push({
            type: 'NEW_COMP',
            title: `🆕 New Strong Comp Detected — ${label}`,
            description:
              `A new composition **${label}** has emerged in patch ${currentPatch} ` +
              `with a win rate of **${(winRate * 100).toFixed(1)}%** over ${sampleSize} games.`,
            compId: row.comp_id,
            data: {
              patch: currentPatch,
              win_rate: `${(winRate * 100).toFixed(1)}%`,
              sample_size: sampleSize,
              label,
            },
          });
        }
      } else {
        // Update existing record's stats.
        registry.set(row.comp_id, { ...existing, win_rate: winRate, sample_size: sampleSize });
      }
    }

    // ── Step 5: Send alerts and persist updated registry ──────────────────
    await Promise.all(alerts.map((a) => this.notification.send(a)));

    // Merge new records into existing registry before re-saving.
    const merged = [...Array.from(registry.values()), ...newRecords];

    await this.redis
      .setex(cacheKey, META_SNAPSHOT_TTL_SECONDS, JSON.stringify(merged))
      .catch((err: Error) => this.logger.warn(`[NewComp] Redis write failed: ${err.message}`));

    this.logger.log(
      `[NewComp] Scanned ${rows.length} comps — ${newRecords.length} new, ${alerts.length} alerts`
    );
    return {
      comps_scanned: rows.length,
      new_comps: newRecords.length,
      alerts_sent: alerts.length,
    };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`[NewComp] Job ${job.id} failed: ${err.message}`);
  }
}
