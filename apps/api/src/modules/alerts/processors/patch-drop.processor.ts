import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { NotificationService } from '../notification.service';
import type { AlertPayload } from '../interfaces/alert.interfaces';
import {
  ALERT_QUEUE_NAME,
  ALERT_JOB_NAMES,
  ALERTS_REDIS_CLIENT,
  LAST_GAME_VERSION_KEY,
  TIER_LIST_CACHE_PREFIX,
} from '../constants/alerts.constants';

/** Non-blocking alternative to KEYS: iterates via SCAN cursor. */
async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    keys.push(...batch);
    cursor = next;
  } while (cursor !== '0');
  return keys;
}

// ── DB row shapes ──────────────────────────────────────────────────────────

interface VersionRow {
  game_version: string;
  game_count: string;
}

/**
 * Processes `check-patch-drop` jobs (scheduled every 30 minutes).
 *
 * Algorithm:
 *  1. Query the latest game_version from the `matches` table.
 *  2. Compare to the last-known version stored in Redis.
 *  3. If changed:
 *     a. Determine if it's a full patch or micro-patch (hotfix).
 *     b. Send PATCH_DROP or HOTFIX alert.
 *     c. Invalidate all `tier-list:*` Redis keys so the next request recomputes.
 *     d. Save the new version to Redis.
 *
 * Patch vs hotfix detection:
 *   A semantic TFT version looks like "Version 14.3.450.3456 (...)".
 *   We parse major + minor (e.g. "14.3") from the first two numeric components.
 *   If the major.minor pair changes → full PATCH_DROP.
 *   If only the build number changes → HOTFIX.
 */
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor(ALERT_QUEUE_NAME, { concurrency: 1 })
export class PatchDropProcessor extends WorkerHost {
  private readonly logger = new Logger(PatchDropProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notification: NotificationService,
    @Inject(ALERTS_REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue('patch-analysis') private readonly patchAnalysisQueue: Queue
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== ALERT_JOB_NAMES.CHECK_PATCH_DROP) return;

    this.logger.debug(`[PatchDrop] Processing job ${job.id}`);

    // ── Step 1: Get latest game_version from DB ───────────────────────────
    const rows = await this.dataSource.query<VersionRow[]>(
      `SELECT game_version, COUNT(*)::text AS game_count
       FROM matches
       GROUP BY game_version
       ORDER BY MAX(game_datetime) DESC
       LIMIT 1`
    );

    const latestVersion = rows[0]?.game_version;
    if (!latestVersion) {
      this.logger.warn('[PatchDrop] No matches found — skipping');
      return { skipped: true };
    }

    // ── Step 2: Compare to last-known version ─────────────────────────────
    const lastVersion = await this.redis.get(LAST_GAME_VERSION_KEY).catch(() => null);

    if (!lastVersion) {
      // First run — store version as baseline.
      await this.redis.set(LAST_GAME_VERSION_KEY, latestVersion);
      this.logger.log(`[PatchDrop] Baseline version stored: ${latestVersion}`);
      return { baseline_stored: latestVersion };
    }

    if (lastVersion === latestVersion) {
      this.logger.debug(`[PatchDrop] Version unchanged: ${latestVersion}`);
      return { unchanged: true, version: latestVersion };
    }

    // ── Step 3: Version changed ───────────────────────────────────────────
    const prevPatch = this.extractPatch(lastVersion);
    const newPatch = this.extractPatch(latestVersion);
    const isMicro = prevPatch === newPatch; // same major.minor = hotfix

    const alertType: AlertPayload['type'] = isMicro ? 'HOTFIX' : 'PATCH_DROP';
    const emoji = isMicro ? '🔧' : '🆕';

    const payload: AlertPayload = {
      type: alertType,
      title: isMicro
        ? `${emoji} TFT Hotfix Detected — ${newPatch}`
        : `${emoji} TFT Patch Drop — ${newPatch}`,
      description: isMicro
        ? `A micro-patch (hotfix) was detected in patch **${newPatch}**. ` +
          `Balance changes may affect meta stability.`
        : `Patch **${newPatch}** has dropped! Game version changed from ` +
          `\`${lastVersion}\` → \`${latestVersion}\`. ` +
          `Tier lists and trend data are being refreshed.`,
      data: {
        previous_version: lastVersion,
        new_version: latestVersion,
        previous_patch: prevPatch,
        new_patch: newPatch,
        game_count: rows[0]?.game_count ?? '0',
      },
    };

    // ── Step 3a: Send alert ───────────────────────────────────────────────
    await this.notification.send(payload);

    // ── Step 3b: Invalidate all tier-list cache keys ──────────────────────
    try {
      const keys = await scanKeys(this.redis, `${TIER_LIST_CACHE_PREFIX}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`[PatchDrop] Invalidated ${keys.length} tier-list cache keys`);
      }
    } catch (err) {
      this.logger.warn(
        `[PatchDrop] Failed to invalidate tier-list cache: ${(err as Error).message}`
      );
    }

    // ── Step 3c: Store new version ────────────────────────────────────────
    await this.redis.set(LAST_GAME_VERSION_KEY, latestVersion);

    // ── Step 3d: Trigger Patch Diff Analyzer ─────────────────────────────
    // If it's a full patch drop (or hotfix), we can trigger the analyzer.
    // The analyzer extracts the major.minor patch natively.
    this.logger.log(`[PatchDrop] Enqueuing patch-analysis for ${newPatch}`);
    await this.patchAnalysisQueue.add('analyze-patch', { patch: newPatch }, { priority: 2 });

    this.logger.log(`[PatchDrop] ${alertType} alert sent — ${lastVersion} → ${latestVersion}`);
    return { alert_type: alertType, previous: lastVersion, current: latestVersion };
  }

  /**
   * Extracts the "major.minor" patch string from a full game_version string.
   * Example: "Version 14.3.450.3456 (branch ...)" → "14.3"
   * Falls back to the raw version string if parsing fails.
   */
  private extractPatch(gameVersion: string): string {
    const match = /Version\s+(\d+)\.(\d+)/.exec(gameVersion);
    if (match) return `${match[1]}.${match[2]}`;
    // Fallback: first two dot-separated segments.
    return gameVersion.split('.').slice(0, 2).join('.');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`[PatchDrop] Job ${job.id} failed: ${err.message}`);
  }
}
