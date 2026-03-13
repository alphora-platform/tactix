import { getTierConfig } from '@/lib/utils/display.utils';
import { cn } from '@/lib/utils/cn';

interface TierBadgeProps {
  tier: 'S' | 'A' | 'B' | 'C';
  size?: 'sm' | 'md';
}

const TIER_GLOW: Record<'S' | 'A' | 'B' | 'C', string> = {
  S: '0 0 10px rgba(245,158,11,0.65), 0 0 3px rgba(245,158,11,0.4)',
  A: '0 0 10px rgba(139,92,246,0.65), 0 0 3px rgba(139,92,246,0.4)',
  B: '0 0 8px rgba(16,185,129,0.55), 0 0 3px rgba(16,185,129,0.3)',
  C: '0 0 6px rgba(107,114,128,0.3)',
};

const TIER_BORDER: Record<'S' | 'A' | 'B' | 'C', string> = {
  S: 'rgba(245,158,11,0.4)',
  A: 'rgba(139,92,246,0.4)',
  B: 'rgba(16,185,129,0.35)',
  C: 'rgba(107,114,128,0.25)',
};

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const config = getTierConfig(tier);

  return (
    <span
      className={cn(
        'inline-flex items-center font-russo font-bold uppercase tracking-widest',
        config.color,
        config.bgColor,
        size === 'sm'
          ? 'rounded-md px-1.5 py-0.5 text-[10px]'
          : 'rounded-lg px-2.5 py-1 text-[11px]'
      )}
      style={{
        boxShadow: TIER_GLOW[tier],
        border: `1px solid ${TIER_BORDER[tier]}`,
      }}
    >
      {config.label}
    </span>
  );
}
