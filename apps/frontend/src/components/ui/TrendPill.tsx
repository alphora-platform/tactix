import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendDirection } from '@/lib/types/analytics.types';
import { cn } from '@/lib/utils/cn';

interface TrendPillProps {
  direction: TrendDirection;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const CONFIG: Record<
  TrendDirection,
  { icon: typeof Minus; color: string; bg: string; border: string; label: string }
> = {
  RISING: {
    icon: TrendingUp,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Rising',
  },
  FALLING: {
    icon: TrendingDown,
    color: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    label: 'Falling',
  },
  STABLE: {
    icon: Minus,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    label: 'Stable',
  },
};

export function TrendPill({ direction, showLabel = true, size = 'sm' }: TrendPillProps) {
  const { icon: Icon, color, bg, border, label } = CONFIG[direction];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
        color,
        bg,
        border,
        size === 'sm' && 'text-[11px]',
        size === 'md' && 'text-xs'
      )}
    >
      <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />
      {showLabel && label}
    </span>
  );
}
