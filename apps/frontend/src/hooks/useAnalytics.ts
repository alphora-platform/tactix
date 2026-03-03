import { useQuery } from '@tanstack/react-query';
import {
  fetchMeta,
  fetchTierList,
  fetchCompTrend,
  fetchCompDetail,
  fetchRegionalMeta,
  fetchRegionalExclusive,
  fetchRegionComparison,
} from '@/lib/api/analytics.api';
import type { CompareParams } from '@/lib/api/analytics.api';
import { useSettingsStore } from '@/lib/store/settings.store';

// ── Meta Overview ──────────────────────────────────────────────────────────

export function useMetaQuery(limit = 30) {
  const { selectedPatch, selectedRegion } = useSettingsStore();
  return useQuery({
    queryKey: ['meta', selectedPatch, selectedRegion, limit],
    queryFn: () =>
      fetchMeta({
        patch: selectedPatch || undefined,
        region: selectedRegion || undefined,
        limit,
      }),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Tier List ──────────────────────────────────────────────────────────────

export function useTierListQuery() {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['tier-list', selectedPatch],
    queryFn: () => fetchTierList(selectedPatch || undefined),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Comp Trend ─────────────────────────────────────────────────────────────

export function useCompTrendQuery(compId: string) {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['comp-trend', compId, selectedPatch],
    queryFn: () => fetchCompTrend(compId, selectedPatch || undefined),
    enabled: !!compId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Comp Detail ────────────────────────────────────────────────────────────

export function useCompDetailQuery(compId: string) {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['comp-detail', compId, selectedPatch],
    queryFn: () => fetchCompDetail(compId, selectedPatch || undefined),
    enabled: !!compId,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Regions ────────────────────────────────────────────────────────────────

export function useRegionalMetaQuery(regions?: string) {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['regional-meta', selectedPatch, regions],
    queryFn: () => fetchRegionalMeta({ patch: selectedPatch || undefined, regions }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegionalExclusiveQuery(regions?: string) {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['regional-exclusive', selectedPatch, regions],
    queryFn: () => fetchRegionalExclusive({ patch: selectedPatch || undefined, regions }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegionCompareQuery(params: Omit<CompareParams, 'patch'>) {
  const { selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['region-compare', selectedPatch, params.regionA, params.regionB],
    queryFn: () =>
      fetchRegionComparison({
        ...params,
        patch: selectedPatch || undefined,
      }),
    enabled: !!(params.regionA && params.regionB),
    staleTime: 5 * 60 * 1000,
  });
}
