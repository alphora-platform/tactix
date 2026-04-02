import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface DbStats {
  players: number;
  matches: number;
  metaSnapshots: number;
  patchVersions: number;
}

export interface PurgeResult {
  deletedMatches: number;
  deletedSnapshots: number;
  deletedPatchVersions: number;
  deletedPatchPredictions: number;
}

export interface CrawlSettings {
  id: number;
  crawlMode: 'pbe' | 'official';
  activeRegions: string[];
  activePatch: string | null;
  isEnabled: boolean;
  updatedAt: string;
}

export type UpdateCrawlSettingsDto = Partial<
  Pick<CrawlSettings, 'crawlMode' | 'activeRegions' | 'activePatch' | 'isEnabled'>
>;

const QUERY_KEY = ['settings', 'crawl'];

export function useCrawlSettings() {
  return useQuery<CrawlSettings>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/crawl');
      return data;
    },
  });
}

export function useDbStats() {
  return useQuery<DbStats>({
    queryKey: ['settings', 'db', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/db/stats');
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function usePurgeMatchData() {
  const queryClient = useQueryClient();
  return useMutation<PurgeResult>({
    mutationFn: async () => {
      const { data } = await apiClient.post('/settings/db/purge-match-data', undefined, {
        timeout: 120_000, // 2 min — TRUNCATE on large datasets can take time
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'db', 'stats'] });
    },
  });
}

export function useCollectPlayers() {
  return useMutation<{ totalPlayers: number; durationMs: number }>({
    mutationFn: async () => {
      const { data } = await apiClient.post('/data-collector/collect-players');
      return data;
    },
  });
}

export function useCollectMatches() {
  return useMutation<{ totalNewMatches: number; durationMs: number }>({
    mutationFn: async () => {
      const { data } = await apiClient.post('/data-collector/collect-matches', undefined, {
        timeout: 120_000,
      });
      return data;
    },
  });
}

export function useUpdateCrawlSettings() {
  const queryClient = useQueryClient();
  return useMutation<CrawlSettings, Error, UpdateCrawlSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch('/settings/crawl', dto);
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
    },
  });
}
