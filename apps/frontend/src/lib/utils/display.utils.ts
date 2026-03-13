type TierKey = 'S' | 'A' | 'B' | 'C';

const TIER_CONFIG: Record<TierKey, { color: string; bgColor: string; label: TierKey }> = {
  S: { color: 'text-amber-400', bgColor: 'bg-amber-500/15', label: 'S' },
  A: { color: 'text-violet-400', bgColor: 'bg-violet-500/15', label: 'A' },
  B: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', label: 'B' },
  C: { color: 'text-slate-400', bgColor: 'bg-slate-500/15', label: 'C' },
};

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function getPlacementColor(placement: number): string {
  if (!Number.isFinite(placement)) return 'text-red-400';
  if (placement <= 1) return 'text-amber-400';
  if (placement <= 4) return 'text-emerald-400';
  return 'text-red-400';
}

export function getWinRateColor(rate: number): string {
  const percent = toPercent(rate);

  if (percent > 60) return 'text-emerald-400';
  if (percent >= 45) return 'text-amber-400';
  return 'text-rose-400';
}

export function getTierConfig(tier: string): {
  color: string;
  bgColor: string;
  label: string;
} {
  const normalizedTier = (tier || '').toUpperCase() as TierKey;
  return TIER_CONFIG[normalizedTier] ?? TIER_CONFIG.C;
}

export function formatWinRate(value: number): string {
  return `${toPercent(value).toFixed(1)}%`;
}
