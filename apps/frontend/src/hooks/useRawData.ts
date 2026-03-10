import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export function useRawPlayerByName(name: string) {
  return useQuery({
    queryKey: ['raw-player-name', name],
    queryFn: async () => {
      const { data } = await apiClient.get(`/raw-data/player/name/${encodeURIComponent(name)}`);
      return data;
    },
    enabled: !!name,
  });
}

export function useRawPlayerByPuuid(puuid: string) {
  return useQuery({
    queryKey: ['raw-player-puuid', puuid],
    queryFn: async () => {
      const { data } = await apiClient.get(`/raw-data/player/${puuid}`);
      return data;
    },
    enabled: !!puuid,
  });
}

export function useRawMatch(matchId: string) {
  return useQuery({
    queryKey: ['raw-match', matchId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/raw-data/match/${matchId}`);
      return data;
    },
    enabled: !!matchId,
  });
}
