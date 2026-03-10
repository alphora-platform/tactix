import { BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

// ── Recharts theme tokens ─────────────────────────────────────────────────────
// Import and spread these into your Recharts components for a consistent look.
//
// Usage example:
//   <Tooltip {...defaultChartTheme.tooltip} />
//   <XAxis {...defaultChartTheme.xAxis} dataKey="name" />
//   <CartesianGrid {...defaultChartTheme.cartesianGrid} />
// ─────────────────────────────────────────────────────────────────────────────

export const defaultChartTheme = {
  tooltip: {
    contentStyle: {
      background: '#161a23',
      border: '1px solid #2a3040',
      borderRadius: 8,
      color: '#e0e0e0',
      fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    },
    cursor: { fill: 'rgba(255,255,255,0.04)' },
    labelStyle: { color: '#9e9e9e', marginBottom: 4 },
    itemStyle: { color: '#e0e0e0' },
  },
  xAxis: {
    tick: { fill: '#9e9e9e', fontSize: 12 },
    axisLine: { stroke: '#2a3040' },
    tickLine: false as const,
  },
  yAxis: {
    tick: { fill: '#9e9e9e', fontSize: 12 },
    axisLine: { stroke: '#2a3040' },
    tickLine: false as const,
    width: 40,
  },
  cartesianGrid: {
    stroke: '#2a3040',
    strokeDasharray: '3 3',
    vertical: false,
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Slot for dropdown filters, buttons, etc. — renders right-aligned in header */
  actions?: React.ReactNode;
  /** Chart area height in px (default 300) */
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
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-card overflow-hidden',
        className
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold leading-snug text-slate-100">{title}</h3>
          {subtitle && <p className="mt-1 truncate text-sm text-slate-400">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────── */}
      <div className="px-6 pb-6 pt-4" style={{ height }}>
        {loading ? (
          /* ── Loading skeleton ────────────────────────────────────────── */
          <div className="h-full flex flex-col gap-3 px-3 pt-3 pb-1">
            {/* Fake y-axis guideline skeletons */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 flex-1">
                <div className="skeleton h-3 w-8 rounded-full shrink-0" />
                <div className="skeleton h-px flex-1" />
              </div>
            ))}
            {/* Fake bars / line area */}
            <div className="flex items-end gap-2 px-8 pb-2 h-full">
              {[60, 80, 45, 90, 55, 70, 50].map((h, i) => (
                <div key={i} className="skeleton flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ) : empty ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <BarChart2 size={40} className="text-text-secondary opacity-25" strokeWidth={1.5} />
            <p className="text-sm text-text-secondary">{emptyText}</p>
          </div>
        ) : (
          /* ── Actual chart ────────────────────────────────────────────── */
          children
        )}
      </div>
    </div>
  );
}
