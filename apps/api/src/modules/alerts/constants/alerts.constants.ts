import { QUEUE_NAMES } from '../../data-collector/constants/queue.constants';

/** Re-export so alerts module doesn't duplicate the queue name string. */
export const ALERT_QUEUE_NAME = QUEUE_NAMES.ALERTS;

/** Alert job name constants. */
export const ALERT_JOB_NAMES = {
  /** Compares current win/play rates vs 12h-ago snapshot. Scheduled hourly. */
  CHECK_META_SHIFT: 'check-meta-shift',
  /** Finds brand-new comps not seen in past 48h. Scheduled every 6h. */
  CHECK_NEW_COMP: 'check-new-comp',
  /** Detects game version changes (patch drops). Scheduled every 30 min. */
  CHECK_PATCH_DROP: 'check-patch-drop',
} as const;

export type AlertJobName = (typeof ALERT_JOB_NAMES)[keyof typeof ALERT_JOB_NAMES];

// ── Redis cache keys ──────────────────────────────────────────────────────

/** Prefix for snapshots cached by meta-shift processor. */
export const META_SNAPSHOT_CACHE_KEY = 'alerts:meta-snapshot';

/** Key storing the last-known game version string. */
export const LAST_GAME_VERSION_KEY = 'alerts:last-game-version';

/** Key for the tier-list Redis cache — also invalidated on patch drop. */
export const TIER_LIST_CACHE_PREFIX = 'tier-list';

// ── Discord embed colour palette ──────────────────────────────────────────

/** Discord embed colours per alert type (decimal ints). */
export const ALERT_COLORS = {
  RISING: 0x00ff00, // green
  FALLING: 0xff0000, // red
  NEW_COMP: 0x0099ff, // blue
  PATCH: 0xffaa00, // amber
  HOTFIX: 0xff6600, // orange
} as const;

// ── Injection token ───────────────────────────────────────────────────────

/** ioredis client injection token for the alerts module. */
export const ALERTS_REDIS_CLIENT = 'ALERTS_REDIS_CLIENT';

// ── Thresholds ────────────────────────────────────────────────────────────

/** Play-rate delta that triggers a META_SHIFT alert (fraction, e.g. 0.03 = 3%). */
export const META_SHIFT_PLAYRATE_THRESHOLD = 0.03;

/** Win-rate delta that triggers a META_SHIFT alert (fraction, e.g. 0.05 = 5%). */
export const META_SHIFT_WINRATE_THRESHOLD = 0.05;

/** Win-rate floor for a new comp to be considered worth alerting. */
export const NEW_COMP_WIN_RATE_FLOOR = 0.55;

/** Minimum sample size for a new comp to be considered worth alerting. */
export const NEW_COMP_MIN_SAMPLE = 30;

/** Age (ms) beyond which a snapshot is treated as "not seen before" = new comp. */
export const NEW_COMP_AGE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h

/** TTL (seconds) for meta-snapshot Redis cache. */
export const META_SNAPSHOT_TTL_SECONDS = 13 * 60 * 60; // 13h (slightly over 12h window)
