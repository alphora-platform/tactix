import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: number;
    label?: string;
    invertColor?: boolean;
  };
  accentColor?: string;
  accentGradient?: string;
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
  accentGradient = 'from-[var(--accent-primary)] to-[var(--accent-cyan)]',
  loading = false,
  className,
}: StatCardProps) {
  const isPositiveTrend = trend ? (trend.invertColor ? trend.value < 0 : trend.value > 0) : false;

  const trendColor = isPositiveTrend ? 'text-accent-green' : 'text-accent-red';
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;
  const trendSign = trend && trend.value > 0 ? '+' : '';

  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-card animate-pulse',
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-gradient-to-r from-[var(--accent-primary)]/30 to-[var(--accent-cyan)]/30" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 rounded-full bg-[var(--bg-overlay)]/70" />
            <div className="h-9 w-28 rounded-lg bg-[var(--bg-overlay)]/70" />
            <div className="h-2.5 w-20 rounded-full bg-[var(--bg-overlay)]/60" />
          </div>
          <div className="size-10 shrink-0 rounded-xl bg-[var(--bg-overlay)]/70" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-card',
        'cursor-default transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover hover:border-[var(--accent-primary)]/25',
        className
      )}
    >
      {/* Gradient top border — 3px thick */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-gradient-to-r',
          accentGradient
        )}
      />

      {/* Hover glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.06) 0%, transparent 65%)',
        }}
      />

      {/* Inner top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-white/[0.04]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            {title}
          </p>
          <p className="font-chakra text-[2rem] font-bold tabular-nums leading-none text-[var(--text-primary)] mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={cn('mt-2 flex items-center gap-1', trendColor)}>
              <TrendIcon size={12} strokeWidth={2.5} className="shrink-0" />
              <span className="text-xs font-semibold tabular-nums">
                {trendSign}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs font-normal text-[var(--text-secondary)]">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl size-10',
              'transition-transform duration-200 group-hover:scale-110',
              iconBg
            )}
          >
            <Icon size={18} className={iconColor} strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  );
}
