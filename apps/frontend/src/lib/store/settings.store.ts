import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  /** Player PUUID used for tracker features. Empty string = not set. */
  puuid: string;
  /** Currently selected patch, e.g. "14.3". Empty = auto-detect from API. */
  selectedPatch: string;
  /** Currently selected region filter, e.g. "KR". Empty = all regions. */
  selectedRegion: string;

  setPuuid: (puuid: string) => void;
  setSelectedPatch: (patch: string) => void;
  setSelectedRegion: (region: string) => void;
  clearPuuid: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      puuid: '',
      selectedPatch: '',
      selectedRegion: '',

      setPuuid: (puuid) => set({ puuid }),
      setSelectedPatch: (selectedPatch) => set({ selectedPatch }),
      setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
      clearPuuid: () => set({ puuid: '' }),
    }),
    { name: 'tactix-settings' }
  )
);
