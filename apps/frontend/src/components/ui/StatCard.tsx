import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string; // e.g. 'text-accent-gold'
  iconBg?: string; // e.g. 'bg-accent-gold/10'
  trend?: {
    value: number; // positive = better, negative = worse
    label?: string; // e.g. 'vs last patch'
    invertColor?: boolean; // true when positive is bad (e.g. avg placement)
  };
  accentColor?: string; // left border color: 'border-l-accent-gold' etc.
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-text-secondary',
  iconBg = 'bg-bg-elevated',
  trend,
  accentColor,
  loading = false,
  className,
}: StatCardProps) {
  // ── Trend logic ────────────────────────────────────────────────────────────
  const isPositiveTrend = trend
    ? trend.invertColor
      ? trend.value < 0 // lower is better
      : trend.value > 0 // higher is better
    : false;

  const trendColor = isPositiveTrend ? 'text-accent-green' : 'text-accent-red';
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendSign = trend && trend.value > 0 ? '+' : '';

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className={cn(
          'bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-card animate-pulse',
          accentColor && `border-l-[3px] ${accentColor}`,
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            {/* Title skeleton */}
            <div className="h-3.5 w-24 rounded-full bg-[var(--bg-overlay)]/70" />
            {/* Value skeleton */}
            <div className="h-8 w-32 rounded-lg bg-[var(--bg-overlay)]/70" />
            {/* Subtitle / trend skeleton */}
            <div className="h-3 w-20 rounded-full bg-[var(--bg-overlay)]/70" />
          </div>
          {/* Icon skeleton */}
          <div className="size-10 rounded-full shrink-0 bg-[var(--bg-overlay)]/70" />
        </div>
      </div>
    );
  }

  // ── Rendered card ──────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'group relative bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-card',
        'hover:-translate-y-0.5 transition-all duration-200',
        accentColor && `border-l-[3px] ${accentColor}`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* ── Left: text content ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 min-w-0">
          {/* Title */}
          <p className="text-sm text-text-secondary font-medium tracking-wide truncate">{title}</p>

          {/* Value */}
          <p className="text-3xl font-bold tabular-nums text-text-primary leading-none mt-1">
            {value}
          </p>

          {/* Subtitle */}
          {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}

          {/* Trend */}
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
              <TrendIcon size={13} strokeWidth={2.5} className="shrink-0" />
              <span className="text-xs font-semibold tabular-nums">
                {trendSign}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs text-text-secondary font-normal">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Right: icon badge ──────────────────────────────────────────── */}
        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center size-10 rounded-full shrink-0',
              'transition-transform duration-200 group-hover:scale-110',
              iconBg
            )}
          >
            <Icon size={18} className={iconColor} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
