import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface PlayerListItem {
  puuid: string;
  region: string;
  summonerName: string | null;
  tier: string | null;
  lp: number | null;
  wins: number;
  losses: number;
  updatedAt: string;
}

export interface PlayersResponse {
  data: PlayerListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PlayersFilter {
  page?: number;
  limit?: number;
  region?: string;
  name?: string;
  tier?: string;
}

export function useRawPlayers(filters: PlayersFilter) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.region) params.set('region', filters.region);
  if (filters.name) params.set('name', filters.name);
  if (filters.tier) params.set('tier', filters.tier);

  return useQuery<PlayersResponse>({
    queryKey: ['raw-players', filters],
    queryFn: async () => {
      const { data } = await apiClient.get(`/raw-data/players?${params.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

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
