import { Sun, Monitor, Moon } from 'lucide-react';
import { useThemeStore } from '../../lib/store/theme.store';
import { cn } from '../../lib/utils/cn';

type ThemeMode = 'light' | 'dark' | 'system';

const MODES: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-bg-elevated border border-border p-0.5"
      role="group"
      aria-label="Theme selector"
    >
      {MODES.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-label={`${label} theme`}
            aria-pressed={active}
            className={cn(
              'relative flex items-center justify-center rounded-md p-1.5 transition-all duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-1 focus-visible:ring-offset-bg-card',
              active
                ? 'bg-accent-gold/20 text-accent-gold shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
            )}
          >
            <Icon size={15} strokeWidth={active ? 2.5 : 2} />
            {active && <span className="sr-only">{label} (active)</span>}
          </button>
        );
      })}
    </div>
  );
}
