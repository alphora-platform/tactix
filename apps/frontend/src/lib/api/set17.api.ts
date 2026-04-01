import { apiClient } from './client';
import type { Set17Champion, Set17Trait } from '../types/set17';

export const getSet17Champions = () =>
  apiClient.get<Set17Champion[]>('/metadata/set17/champions').then((r) => r.data);

export const getSet17Traits = () =>
  apiClient.get<Set17Trait[]>('/metadata/set17/traits').then((r) => r.data);
