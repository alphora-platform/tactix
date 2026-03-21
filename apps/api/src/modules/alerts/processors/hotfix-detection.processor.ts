import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { NotificationService } from '../notification.service';
import type { AlertPayload } from '../interfaces/alert.interfaces';
import {
  ALERT_QUEUE_NAME,
  ALERT_JOB_NAMES,
  ALERTS_REDIS_CLIENT,
  LAST_FULL_VERSION_KEY,
  TIER_LIST_CACHE_PREFIX,
  PLAYBOOK_CACHE_PREFIX,
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

interface VersionRow {
  game_version: string;
}

/**
 * Processes `check-hotfix` jobs (scheduled every 15 minutes).
 *
 * Dedicated to detecting micro-patches (hotfixes) that don't change the
 * major.minor patch version but do change the build number.
 *
 * Algorithm:
 *  1. Query the latest full game_version from the matches table.
 *  2. Compare to the last-known full version stored in Redis.
 *  3. If changed AND the major.minor is the same → HOTFIX detected.
 *  4. Send a HOTFIX alert with version diff.
 *  5. Invalidate tier-list and playbook caches.
 *  6. Trigger a meta snapshot comparison to measure hotfix impact.
 *
 * If the major.minor changes, this processor skips — the PatchDropProcessor
 * handles full patch drops on its own 30-minute cycle.
 */
@Processor(ALERT_QUEUE_NAME, { concurrency: 1 })
export class HotfixDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(HotfixDetectionProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notification: NotificationService,
    @Inject(ALERTS_REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue('patch-analysis') private readonly patchAnalysisQueue: Queue
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== ALERT_JOB_NAMES.CHECK_HOTFIX) return;

    this.logger.debug(`[HotfixDetect] Processing job ${job.id}`);

    // Step 1: Get latest full game_version from DB
    const rows = await this.dataSource.query<VersionRow[]>(
      `SELECT game_version
       FROM matches
       ORDER BY game_datetime DESC
       LIMIT 1`
    );

    const currentVersion = rows[0]?.game_version;
    if (!currentVersion) {
      this.logger.warn('[HotfixDetect] No matches found — skipping');
      return { skipped: true };
    }

    // Step 2: Compare to last-known full version
    const lastVersion = await this.redis.get(LAST_FULL_VERSION_KEY).catch(() => null);

    if (!lastVersion) {
      await this.redis.set(LAST_FULL_VERSION_KEY, currentVersion);
      this.logger.log(`[HotfixDetect] Baseline full version stored: ${currentVersion}`);
      return { baseline_stored: currentVersion };
    }

    if (lastVersion === currentVersion) {
      this.logger.debug(`[HotfixDetect] Version unchanged: ${currentVersion}`);
      return { unchanged: true, version: currentVersion };
    }

    // Step 3: Determine if this is a hotfix (same major.minor, different build)
    const prevPatch = this.extractMajorMinor(lastVersion);
    const newPatch = this.extractMajorMinor(currentVersion);

    if (prevPatch !== newPatch) {
      // Full patch change — let PatchDropProcessor handle it.
      // Still update our tracked version so we don't re-alert.
      await this.redis.set(LAST_FULL_VERSION_KEY, currentVersion);
      this.logger.debug(
        `[HotfixDetect] Full patch change detected (${prevPatch} → ${newPatch}), deferring to PatchDropProcessor`
      );
      return { deferred_to_patch_drop: true, previous: lastVersion, current: currentVersion };
    }

    // It's a hotfix — same major.minor, different build number
    this.logger.log(`[HotfixDetect] 🔧 HOTFIX DETECTED: ${lastVersion} → ${currentVersion}`);

    const prevBuild = this.extractBuildNumber(lastVersion);
    const newBuild = this.extractBuildNumber(currentVersion);

    const payload: AlertPayload = {
      type: 'HOTFIX',
      title: `🔧 HOTFIX DETECTED — Patch ${newPatch}`,
      description:
        `A micro-patch (hotfix) has been detected in patch **${newPatch}**.\n\n` +
        `**Version diff:** \`${lastVersion}\` → \`${currentVersion}\`\n` +
        `**Build:** \`${prevBuild}\` → \`${newBuild}\`\n\n` +
        `Balance changes may affect meta stability. ` +
        `A meta snapshot comparison has been triggered to measure impact.`,
      data: {
        previous_version: lastVersion,
        new_version: currentVersion,
        patch: newPatch,
        previous_build: prevBuild,
        new_build: newBuild,
        detection_method: 'hotfix-monitor-15min',
      },
    };

    // Step 4: Send hotfix alert
    await this.notification.send(payload);

    // Step 5: Invalidate caches (tier-list + playbook)
    await this.invalidateCaches();

    // Step 6: Store new version
    await this.redis.set(LAST_FULL_VERSION_KEY, currentVersion);

    // Step 7: Trigger meta snapshot comparison for impact analysis
    this.logger.log(`[HotfixDetect] Triggering meta snapshot comparison for patch ${newPatch}`);
    await this.patchAnalysisQueue.add(
      'analyze-patch',
      {
        patch: newPatch,
        trigger: 'hotfix',
        previous_version: lastVersion,
        new_version: currentVersion,
      },
      { priority: 1 }
    );

    // Also trigger an immediate meta-shift check to compare pre/post hotfix
    await this.redis.publish(
      'alerts:trigger',
      JSON.stringify({
        type: 'meta-shift-check',
        reason: 'hotfix-detected',
        patch: newPatch,
      })
    );

    this.logger.log(
      `[HotfixDetect] HOTFIX alert sent and meta comparison triggered — ${lastVersion} → ${currentVersion}`
    );

    return {
      alert_type: 'HOTFIX',
      previous: lastVersion,
      current: currentVersion,
      patch: newPatch,
    };
  }

  /**
   * Extracts "major.minor" from a game version string.
   * Example: "Version 14.5.450.3456" → "14.5"
   */
  private extractMajorMinor(gameVersion: string): string {
    const match = /(\d+)\.(\d+)/.exec(gameVersion);
    if (match) return `${match[1]}.${match[2]}`;
    return gameVersion.split('.').slice(0, 2).join('.');
  }

  /**
   * Extracts the build number portion from a game version.
   * Example: "Version 14.5.450.3456" → "450.3456"
   */
  private extractBuildNumber(gameVersion: string): string {
    const match = /\d+\.\d+\.(.+?)(?:\s|$)/.exec(gameVersion);
    return match ? match[1] : gameVersion;
  }

  /**
   * Invalidates tier-list and playbook Redis caches so that the next request
   * recomputes with post-hotfix data.
   */
  private async invalidateCaches(): Promise<void> {
    try {
      const [tierKeys, playbookKeys] = await Promise.all([
        scanKeys(this.redis, `${TIER_LIST_CACHE_PREFIX}:*`),
        scanKeys(this.redis, `${PLAYBOOK_CACHE_PREFIX}:*`),
      ]);
      const allKeys = [...tierKeys, ...playbookKeys];

      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        this.logger.log(
          `[HotfixDetect] Invalidated ${tierKeys.length} tier-list + ${playbookKeys.length} playbook cache keys`
        );
      }
    } catch (err) {
      this.logger.warn(`[HotfixDetect] Cache invalidation failed: ${(err as Error).message}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`[HotfixDetect] Job ${job.id} failed: ${err.message}`);
  }
}
