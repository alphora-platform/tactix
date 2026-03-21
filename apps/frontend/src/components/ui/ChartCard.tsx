import { BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export const defaultChartTheme = {
  tooltip: {
    contentStyle: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 10,
      color: 'var(--text-primary)',
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    cursor: { fill: 'rgba(255,255,255,0.03)' },
    labelStyle: { color: 'var(--text-secondary)', marginBottom: 4 },
    itemStyle: { color: 'var(--text-primary)' },
  },
  xAxis: {
    tick: { fill: 'var(--text-secondary)', fontSize: 11 },
    axisLine: { stroke: 'var(--border-default)' },
    tickLine: false as const,
  },
  yAxis: {
    tick: { fill: 'var(--text-secondary)', fontSize: 11 },
    axisLine: { stroke: 'var(--border-default)' },
    tickLine: false as const,
    width: 40,
  },
  cartesianGrid: {
    stroke: 'rgba(99,160,255,0.06)',
    strokeDasharray: '3 3',
    vertical: false,
  },
} as const;

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  actions,
  height = 300,
  loading = false,
  empty = false,
  emptyText = 'No data available',
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-card',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* Accent dot */}
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)] opacity-80" />
          <div className="min-w-0">
            <h3 className="font-russo truncate text-base font-normal leading-snug text-[var(--text-primary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {/* Chart area */}
      <div className="px-6 pb-6 pt-4" style={{ height }}>
        {loading ? (
          <div className="flex h-full flex-col gap-3 px-3 pb-1 pt-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-3">
                <div className="skeleton h-2.5 w-8 shrink-0 rounded-full" />
                <div className="skeleton h-px flex-1" />
              </div>
            ))}
            <div className="flex h-full items-end gap-2 px-8 pb-2">
              {[60, 80, 45, 90, 55, 70, 50].map((h, i) => (
                <div key={i} className="skeleton flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <BarChart2
              size={36}
              className="text-[var(--text-secondary)] opacity-20"
              strokeWidth={1.5}
            />
            <p className="text-sm text-[var(--text-secondary)]">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
