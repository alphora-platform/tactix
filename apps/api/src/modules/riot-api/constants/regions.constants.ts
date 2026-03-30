export enum Region {
  NA = 'NA',
  EUW = 'EUW',
  KR = 'KR',
  EUNE = 'EUNE',
  BR = 'BR',
  JP = 'JP',
  OCE = 'OCE',
  TR = 'TR',
  VN = 'VN',
  PBE = 'PBE',
}

/**
 * Platform routing — used for League/Summoner endpoints (e.g. /tft/league/v1/challenger).
 * Each region maps to a specific platform host (na1, euw1, etc.)
 */
export const PLATFORM_ROUTES: Record<Region, string> = {
  [Region.NA]: 'na1',
  [Region.EUW]: 'euw1',
  [Region.KR]: 'kr',
  [Region.EUNE]: 'eun1',
  [Region.BR]: 'br1',
  [Region.JP]: 'jp1',
  [Region.OCE]: 'oc1',
  [Region.TR]: 'tr1',
  [Region.VN]: 'vn2',
  [Region.PBE]: 'pbe1',
};

/**
 * Regional routing — used for Match endpoints (e.g. /tft/match/v1/matches/{id}).
 * Multiple platforms share a regional host (americas, europe, asia, sea).
 */
export const REGIONAL_ROUTES: Record<Region, string> = {
  [Region.NA]: 'americas',
  [Region.BR]: 'americas',
  [Region.OCE]: 'sea',
  [Region.VN]: 'sea',
  [Region.KR]: 'asia',
  [Region.JP]: 'asia',
  [Region.EUW]: 'europe',
  [Region.EUNE]: 'europe',
  [Region.TR]: 'europe',
  [Region.PBE]: 'pbe1',
};

export function getPlatformUrl(region: Region): string {
  return `https://${PLATFORM_ROUTES[region]}.api.riotgames.com`;
}

export function getRegionalUrl(region: Region): string {
  return `https://${REGIONAL_ROUTES[region]}.api.riotgames.com`;
}

/** Live regions for data collection (excludes PBE). */
export const LIVE_REGIONS: Region[] = [
  Region.NA,
  Region.EUW,
  Region.KR,
  Region.EUNE,
  Region.BR,
  Region.JP,
  Region.OCE,
  Region.TR,
  Region.VN,
];

/** PBE-only region list for PBE mode. */
export const PBE_REGIONS: Region[] = [Region.PBE];

/** All regions including PBE. */
export const ALL_REGIONS: Region[] = [...LIVE_REGIONS, Region.PBE];

/** Legacy default — kept for backward compat with existing code. */
export const DEFAULT_REGIONS: Region[] = LIVE_REGIONS;

/** Valid platform routing values for API validation. */
export const VALID_PLATFORM_IDS = Object.values(PLATFORM_ROUTES);
