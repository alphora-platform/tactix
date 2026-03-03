import type { Tier } from '@/lib/types/analytics.types';
import { clsx } from 'clsx';

interface TierBadgeProps {
  tier: Tier;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_STYLES: Record<Tier, string> = {
  S: 'bg-accent-gold/20 text-accent-gold border-accent-gold/40',
  A: 'bg-accent-blue/20 text-accent-blue border-accent-blue/40',
  B: 'bg-accent-green/20 text-accent-green border-accent-green/40',
  C: 'bg-bg-elevated text-text-secondary border-border',
};

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-bold border rounded',
        TIER_STYLES[tier],
        size === 'sm' && 'text-xs w-5 h-5',
        size === 'md' && 'text-sm w-7 h-7',
        size === 'lg' && 'text-base w-9 h-9'
      )}
    >
      {tier}
    </span>
  );
}
