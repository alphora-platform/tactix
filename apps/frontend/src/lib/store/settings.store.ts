import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  /** Player PUUID derived from Riot OAuth token. Empty string = not set. */
  puuid: string;
  /** JWT token from Riot OAuth flow. Empty string = not authenticated. */
  token: string;
  /** Riot account game name, e.g. "Faker". */
  gameName: string;
  /** Riot account tag line, e.g. "KR1". */
  tagLine: string;
  /** Currently selected patch, e.g. "14.3". Empty = auto-detect from API. */
  selectedPatch: string;
  /** Currently selected region filter, e.g. "KR". Empty = all regions. */
  selectedRegion: string;

  setPuuid: (puuid: string) => void;
  setAuthToken: (token: string, puuid: string, gameName: string, tagLine: string) => void;
  clearAuth: () => void;
  setSelectedPatch: (patch: string) => void;
  setSelectedRegion: (region: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      puuid: '',
      token: '',
      gameName: '',
      tagLine: '',
      selectedPatch: '',
      selectedRegion: '',

      setPuuid: (puuid) => set({ puuid }),
      setAuthToken: (token, puuid, gameName, tagLine) =>
        set({ token, puuid, gameName, tagLine }),
      clearAuth: () => set({ token: '', puuid: '', gameName: '', tagLine: '' }),
      setSelectedPatch: (selectedPatch) => set({ selectedPatch }),
      setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
    }),
    { name: 'tactix-settings' }
  )
);
