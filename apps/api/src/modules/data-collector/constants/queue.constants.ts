/**
 * Centralised BullMQ queue and job name constants.
 * Import these wherever you reference a queue or job name to avoid typos.
 */

export const QUEUE_NAMES = {
  MATCH_COLLECTION: 'match-collection',
  ETL_PIPELINE: 'etl-pipeline',
  META_ANALYSIS: 'meta-analysis',
  ALERTS: 'alerts',
  VIEW_REFRESH: 'view-refresh',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  /** Fetches top players for a region and enqueues per-player jobs. */
  COLLECT_REGION: 'collect-region',
  /** Fetches and persists matches for a single player. */
  COLLECT_PLAYER: 'collect-player-matches',
  /** Parses raw match JSON into structured entities. */
  PARSE_MATCHES: 'parse-matches',
  /** Transforms a single raw match through the ETL pipeline into normalised DB rows. */
  ETL_PROCESS_MATCH: 'etl-process-match',
  /** Detects dominant team compositions in recent matches. */
  DETECT_COMPS: 'detect-comps',
  /** Checks for meta shift versus previous 12h snapshot. */
  CHECK_META_SHIFT: 'check-meta-shift',
  /** Finds brand-new comps not seen in the past 48h. */
  CHECK_NEW_COMP: 'check-new-comp',
  /** Detects game version / patch changes. */
  CHECK_PATCH_DROP: 'check-patch-drop',
  /** Sends a Discord alert. */
  SEND_DISCORD_ALERT: 'send-discord-alert',
  /** Refreshes all materialized views. */
  REFRESH_VIEWS: 'refresh-materialized-views',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
