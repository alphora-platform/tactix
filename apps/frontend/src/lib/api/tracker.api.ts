import { apiClient } from './client';
import type {
  PlacementDistributionDto,
  CompProficiencyDto,
  RecentGameDto,
  TiltReportDto,
  WeaknessReportDto,
} from '../types/tracker.types';

export async function fetchPlacements(
  puuid: string,
  patch?: string
): Promise<PlacementDistributionDto> {
  const { data } = await apiClient.get<PlacementDistributionDto>(`/tracker/${puuid}/placements`, {
    params: patch ? { patch } : {},
  });
  return data;
}

export async function fetchProficiency(puuid: string, patch?: string): Promise<CompProficiencyDto> {
  const { data } = await apiClient.get<CompProficiencyDto>(`/tracker/${puuid}/proficiency`, {
    params: patch ? { patch } : {},
  });
  return data;
}

export async function fetchRecentGames(puuid: string, limit = 20): Promise<RecentGameDto[]> {
  const { data } = await apiClient.get<RecentGameDto[]>(`/tracker/${puuid}/recent`, {
    params: { limit },
  });
  return data;
}

export async function fetchTiltReport(puuid: string): Promise<TiltReportDto> {
  const { data } = await apiClient.get<TiltReportDto>(`/tracker/${puuid}/tilt`);
  return data;
}

export async function fetchWeeklyReport(puuid: string, patch?: string): Promise<WeaknessReportDto> {
  const { data } = await apiClient.get<WeaknessReportDto>(`/tracker/${puuid}/report/weekly`, {
    params: patch ? { patch } : {},
  });
  return data;
}
