/** Injection token for the ioredis client used by the analytics module. */
export const ANALYTICS_REDIS_CLIENT = 'ANALYTICS_REDIS_CLIENT';

/** Redis key prefix for tier-list cache entries. */
export const TIER_LIST_CACHE_PREFIX = 'tier-list';

/** Default TTL for cached tier-list results (seconds). */
export const TIER_LIST_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
