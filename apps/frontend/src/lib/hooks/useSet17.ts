import { useQuery } from '@tanstack/react-query';
import { getSet17Champions, getSet17Traits } from '../api/set17.api';

export function useSet17Champions() {
  return useQuery({
    queryKey: ['set17', 'champions'],
    queryFn: getSet17Champions,
    staleTime: Infinity,
  });
}

export function useSet17Traits() {
  return useQuery({
    queryKey: ['set17', 'traits'],
    queryFn: getSet17Traits,
    staleTime: Infinity,
  });
}
