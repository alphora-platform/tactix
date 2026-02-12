export enum Region {
  NA = 'NA',
  EUW = 'EUW',
  KR = 'KR',
  OCE = 'OCE',
}

export const PLATFORM_ROUTES: Record<Region, string> = {
  [Region.NA]: 'na1',
  [Region.EUW]: 'euw1',
  [Region.KR]: 'kr',
  [Region.OCE]: 'oc1',
};

export const REGIONAL_ROUTES: Record<Region, string> = {
  [Region.NA]: 'americas',
  [Region.EUW]: 'europe',
  [Region.KR]: 'asia',
  [Region.OCE]: 'sea',
};

export function getPlatformUrl(region: Region): string {
  return `https://${PLATFORM_ROUTES[region]}.api.riotgames.com`;
}

export function getRegionalUrl(region: Region): string {
  return `https://${REGIONAL_ROUTES[region]}.api.riotgames.com`;
}

export const DEFAULT_REGIONS: Region[] = [Region.NA, Region.EUW, Region.KR, Region.OCE];
