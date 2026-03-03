import { apiClient } from './client';
import type {
  ChampionMetadata,
  TraitMetadata,
  ItemMetadata,
  AugmentMetadata,
} from '../types/metadata';

export const getChampions = () =>
  apiClient.get<ChampionMetadata>('/metadata/champions').then((r) => r.data);
export const getTraits = () => apiClient.get<TraitMetadata>('/metadata/traits').then((r) => r.data);
export const getItems = () => apiClient.get<ItemMetadata>('/metadata/items').then((r) => r.data);
export const getAugments = () =>
  apiClient.get<AugmentMetadata>('/metadata/augments').then((r) => r.data);
