type TierKey = 'S' | 'A' | 'B' | 'C';

const TIER_CONFIG: Record<TierKey, { color: string; bgColor: string; label: TierKey }> = {
  S: { color: 'text-yellow-300', bgColor: 'bg-yellow-500/20', label: 'S' },
  A: { color: 'text-blue-300', bgColor: 'bg-blue-500/20', label: 'A' },
  B: { color: 'text-green-300', bgColor: 'bg-green-500/20', label: 'B' },
  C: { color: 'text-slate-300', bgColor: 'bg-slate-500/20', label: 'C' },
};

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

export function getPlacementColor(placement: number): string {
  if (!Number.isFinite(placement)) return 'text-red-400';
  if (placement <= 1) return 'text-yellow-400';
  if (placement <= 4) return 'text-green-400';
  return 'text-red-400';
}

export function getWinRateColor(rate: number): string {
  const percent = toPercent(rate);

  if (percent > 60) return 'text-green-400';
  if (percent >= 45) return 'text-yellow-400';
  return 'text-red-400';
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
