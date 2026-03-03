import { useQuery } from '@tanstack/react-query';
import { getChampions, getTraits, getItems, getAugments } from '../api/metadata.api';

const STALE_TIME = Infinity;

export function useChampions() {
  return useQuery({
    queryKey: ['metadata', 'champions'],
    queryFn: getChampions,
    staleTime: STALE_TIME,
  });
}

export function useTraits() {
  return useQuery({
    queryKey: ['metadata', 'traits'],
    queryFn: getTraits,
    staleTime: STALE_TIME,
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['metadata', 'items'],
    queryFn: getItems,
    staleTime: STALE_TIME,
  });
}

export function useAugments() {
  return useQuery({
    queryKey: ['metadata', 'augments'],
    queryFn: getAugments,
    staleTime: STALE_TIME,
  });
}
