import type { ElementType } from 'react';
import { Segmented } from 'antd';
import { Sun, Monitor, Moon } from 'lucide-react';
import { useThemeStore } from '../../lib/store/theme.store';
import { cn } from '../../lib/utils/cn';

type ThemeMode = 'light' | 'dark' | 'system';

const MODES: { value: ThemeMode; icon: ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  return (
    <Segmented
      aria-label="Theme selector"
      value={theme}
      onChange={(value) => setTheme(value as ThemeMode)}
      options={MODES.map(({ value, icon: Icon, label }) => ({
        value,
        label: (
          <span className="inline-flex items-center justify-center" title={label}>
            <Icon size={15} />
          </span>
        ),
      }))}
      className={cn(
        'rounded-lg border border-[var(--border-default)] !bg-[var(--bg-elevated)] p-0.5',
        '[&_.ant-segmented-item]:!rounded-md [&_.ant-segmented-item]:!text-slate-400',
        '[&_.ant-segmented-item-selected]:!bg-blue-500/10 [&_.ant-segmented-item-selected]:!text-blue-400',
        className
      )}
    />
  );
}
