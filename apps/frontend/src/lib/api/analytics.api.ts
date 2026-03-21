import { apiClient } from './client';
import type {
  CompStatDto,
  TierListDto,
  TrendDto,
  CompDetailDto,
  RegionalMetaDto,
  RegionalExclusiveDto,
  RegionComparisonDto,
  PlaybookDto,
} from '../types/analytics.types';

// ── Meta ───────────────────────────────────────────────────────────────────

export interface MetaParams {
  patch?: string;
  region?: string;
  limit?: number;
}

export async function fetchMeta(params: MetaParams = {}): Promise<CompStatDto[]> {
  const { data } = await apiClient.get<CompStatDto[]>('/analytics/meta', { params });
  return data;
}

// ── Tier List ──────────────────────────────────────────────────────────────

export async function fetchTierList(patch?: string): Promise<TierListDto> {
  const { data } = await apiClient.get<TierListDto>('/analytics/tier-list', {
    params: patch ? { patch } : {},
  });
  return data;
}

// ── Trend ──────────────────────────────────────────────────────────────────

export async function fetchCompTrend(compId: string, patch?: string): Promise<TrendDto> {
  const { data } = await apiClient.get<TrendDto>(`/analytics/trend/${compId}`, {
    params: patch ? { patch } : {},
  });
  return data;
}

// ── Comp Detail ────────────────────────────────────────────────────────────

export async function fetchCompDetail(compId: string, patch?: string): Promise<CompDetailDto> {
  const { data } = await apiClient.get<CompDetailDto>(`/analytics/comp/${compId}`, {
    params: patch ? { patch } : {},
  });
  return data;
}

// ── Regions ────────────────────────────────────────────────────────────────

export interface RegionParams {
  patch?: string;
  regions?: string; // comma-separated e.g. "KR,EUW,NA"
}

export async function fetchRegionalMeta(params: RegionParams = {}): Promise<RegionalMetaDto> {
  const { data } = await apiClient.get<RegionalMetaDto>('/analytics/regions', { params });
  return data;
}

export async function fetchRegionalExclusive(
  params: RegionParams = {}
): Promise<RegionalExclusiveDto[]> {
  const { data } = await apiClient.get<RegionalExclusiveDto[]>('/analytics/regions/exclusive', {
    params,
  });
  return data;
}

export interface CompareParams {
  patch?: string;
  regionA: string;
  regionB: string;
}

export async function fetchRegionComparison(params: CompareParams): Promise<RegionComparisonDto> {
  const { data } = await apiClient.get<RegionComparisonDto>('/analytics/regions/compare', {
    params,
  });
  return data;
}

// ── Playbook ──────────────────────────────────────────────────────────

export interface PlaybookParams {
  patch?: string;
  region?: string;
}

export async function fetchPlaybook(params: PlaybookParams = {}): Promise<PlaybookDto> {
  const { data } = await apiClient.get<PlaybookDto>('/analytics/playbook', {
    params,
  });
  return data;
}

// ── Config ─────────────────────────────────────────────────────────────────

export async function fetchCollectorConfig(): Promise<{ collector_mode: string }> {
  const { data } = await apiClient.get('/analytics/config');
  return data;
}

// ── Patches ────────────────────────────────────────────────────────────────

export interface PatchListDto {
  /** The current active patch, e.g. "16.5". */
  current: string;
  /** All recent patches ordered newest first, e.g. ["16.5", "16.4", ...]. */
  patches: string[];
}

export async function fetchPatches(): Promise<PatchListDto> {
  const { data } = await apiClient.get<PatchListDto>('/analytics/patches');
  return data;
}
