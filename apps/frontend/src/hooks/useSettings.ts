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
      const { data } = await apiClient.post('/settings/db/purge-match-data');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'db', 'stats'] });
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
