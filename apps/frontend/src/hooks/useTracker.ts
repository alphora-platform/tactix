import { useQuery } from '@tanstack/react-query';
import {
  fetchPlacements,
  fetchProficiency,
  fetchRecentGames,
  fetchTiltReport,
  fetchWeeklyReport,
} from '@/lib/api/tracker.api';
import { useSettingsStore } from '@/lib/store/settings.store';

export function usePlacementsQuery() {
  const { puuid, selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['placements', puuid, selectedPatch],
    queryFn: () => fetchPlacements(puuid, selectedPatch || undefined),
    enabled: !!puuid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProficiencyQuery() {
  const { puuid, selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['proficiency', puuid, selectedPatch],
    queryFn: () => fetchProficiency(puuid, selectedPatch || undefined),
    enabled: !!puuid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentGamesQuery(limit = 20) {
  const { puuid } = useSettingsStore();
  return useQuery({
    queryKey: ['recent-games', puuid, limit],
    queryFn: () => fetchRecentGames(puuid, limit),
    enabled: !!puuid,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTiltReportQuery() {
  const { puuid } = useSettingsStore();
  return useQuery({
    queryKey: ['tilt', puuid],
    queryFn: () => fetchTiltReport(puuid),
    enabled: !!puuid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyReportQuery() {
  const { puuid, selectedPatch } = useSettingsStore();
  return useQuery({
    queryKey: ['weekly-report', puuid, selectedPatch],
    queryFn: () => fetchWeeklyReport(puuid, selectedPatch || undefined),
    enabled: !!puuid,
    staleTime: 10 * 60 * 1000,
  });
}
