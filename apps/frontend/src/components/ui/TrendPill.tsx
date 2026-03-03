import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection } from '@/lib/types/analytics.types';
import { clsx } from 'clsx';

interface TrendPillProps {
  direction: TrendDirection;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const CONFIG: Record<TrendDirection, { icon: typeof Minus; color: string; label: string }> = {
  RISING: { icon: TrendingUp, color: 'text-accent-green', label: 'Rising' },
  FALLING: { icon: TrendingDown, color: 'text-accent-red', label: 'Falling' },
  STABLE: { icon: Minus, color: 'text-text-secondary', label: 'Stable' },
};

export function TrendPill({ direction, showLabel = true, size = 'sm' }: TrendPillProps) {
  const { icon: Icon, color, label } = CONFIG[direction];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1',
        color,
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm'
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {showLabel && label}
    </span>
  );
}
