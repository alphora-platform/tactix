import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  /** User's chosen theme preference */
  theme: ThemeMode;
  /** Resolved theme after accounting for system preference */
  resolvedTheme: ResolvedTheme;
  /** Set the theme and update the <html> class accordingly */
  setTheme: (theme: ThemeMode) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme: ThemeMode) => {
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: 'tactix-theme',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Re-apply theme after hydration to ensure <html> class stays in sync
        const resolved = resolveTheme(state.theme);
        applyTheme(resolved);
        // Keep resolvedTheme in sync (system pref may have changed since last visit)
        state.resolvedTheme = resolved;

        // Listen for OS-level dark/light mode changes when "system" is active
        if (typeof window !== 'undefined') {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const current = useThemeStore.getState().theme;
            if (current === 'system') {
              const newResolved = getSystemTheme();
              applyTheme(newResolved);
              useThemeStore.setState({ resolvedTheme: newResolved });
            }
          });
        }
      },
    }
  )
);
