import { getTierConfig } from '@/lib/utils/display.utils';
import { cn } from '@/lib/utils/cn';

interface TierBadgeProps {
  tier: 'S' | 'A' | 'B' | 'C';
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const config = getTierConfig(tier);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--border-subtle)] font-semibold',
        config.color,
        config.bgColor,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      {config.label}
    </span>
  );
}
