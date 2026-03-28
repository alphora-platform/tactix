export const SYSTEM_QUEUE = 'system-jobs';

export const SYSTEM_JOB_NAMES = {
  PURGE_MATCH_DATA: 'purge-match-data',
} as const;

export type SystemJobName = (typeof SYSTEM_JOB_NAMES)[keyof typeof SYSTEM_JOB_NAMES];
