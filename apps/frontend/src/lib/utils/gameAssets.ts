import type {
  ChampionMetadata,
  TraitMetadata,
  ItemMetadata,
  AugmentMetadata,
} from '../types/metadata';

export function formatRawName(apiName: string): string {
  if (!apiName) return '';
  // Strip compound set prefix first, then single prefix
  const stripped = apiName.replace(/^(TFT\d*_Set\d+_?|TFT\d+_?|Set\d+_?|TFT_?)/i, '');
  // Split camelCase boundaries
  const split = stripped.replace(/([A-Z])/g, ' $1').trim();
  return split
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getTraitName(apiName: string, traits?: TraitMetadata): string {
  if (traits?.[apiName]?.name) return traits[apiName].name;
  return formatRawName(apiName);
}

export function getChampionName(apiName: string, champions?: ChampionMetadata): string {
  if (champions?.[apiName]?.name) return champions[apiName].name;
  return formatRawName(apiName);
}

export function getItemName(apiName: string, items?: ItemMetadata): string {
  if (items?.[apiName]?.name) return items[apiName].name;
  return formatRawName(apiName.replace(/Item_/i, ''));
}

export function getAugmentName(apiName: string, augments?: AugmentMetadata): string {
  if (augments?.[apiName]?.name) return augments[apiName].name;
  return formatRawName(apiName);
}

export function getTraitIconUrl(apiName: string, traits?: TraitMetadata): string {
  return traits?.[apiName]?.icon || '';
}

export function getChampionSquareUrl(apiName: string, champions?: ChampionMetadata): string {
  return champions?.[apiName]?.squareIcon || '';
}

export function getItemIconUrl(apiName: string, items?: ItemMetadata): string {
  return items?.[apiName]?.icon || '';
}

export function getAugmentIconUrl(apiName: string, augments?: AugmentMetadata): string {
  return augments?.[apiName]?.icon || '';
}

export function getCostColor(cost: number): string {
  switch (cost) {
    case 1:
      return '#808080';
    case 2:
      return '#11a849';
    case 3:
      return '#207ac7';
    case 4:
      return '#b44be1';
    case 5:
      return '#e9a617';
    default:
      return '#808080';
  }
}
