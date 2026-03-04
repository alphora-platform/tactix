import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMetaQuery } from '@/hooks/useAnalytics';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TierBadge } from '@/components/ui/TierBadge';
import { ChartCard, defaultChartTheme } from '@/components/ui/ChartCard';
import { DataTableCard } from '@/components/ui/DataTableCard';
import type { Column } from '@/components/ui/DataTableCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Flame, TrendingDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Link } from '@tanstack/react-router';
import type { CompStatDto } from '@/lib/types/analytics.types';

export const Route = createFileRoute('/trends/')({
  component: TrendsPage,
});

// ── Runtime extended type ──────────────────────────────────────────────────────
type RichComp = CompStatDto & {
  comp_label?: string;
  trait_icons?: string[];
};

// ── Trend badge ────────────────────────────────────────────────────────────────
function TrendBadge({ direction }: { direction?: string }) {
  if (direction === 'RISING')
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent-green/15 border border-accent-green/30 text-accent-green text-[10px] font-bold whitespace-nowrap">
        <ArrowUp size={10} strokeWidth={3} />
        RISING
      </span>
    );
  if (direction === 'FALLING')
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent-red/15 border border-accent-red/30 text-accent-red text-[10px] font-bold whitespace-nowrap">
        <ArrowDown size={10} strokeWidth={3} />
        FALLING
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-text-secondary text-[10px] font-medium whitespace-nowrap">
      <Minus size={10} strokeWidth={2} />
      STABLE
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
function TrendsPage() {
  const meta = useMetaQuery(30);
  const navigate = useNavigate();

  // Dedup by comp_id, keep highest sample_size
  const data = useMemo<RichComp[]>(() => {
    if (!meta.data) return [];
    const map = new Map<string, RichComp>();
    for (const comp of meta.data as RichComp[]) {
      const existing = map.get(comp.comp_id);
      if (!existing || existing.sample_size < comp.sample_size) {
        map.set(comp.comp_id, comp);
      }
    }
    return Array.from(map.values());
  }, [meta.data]);

  // Rising / Falling subsets
  const rising = useMemo(
    () => data.filter((c) => c.trend_direction === 'RISING').slice(0, 6),
    [data]
  );
  const falling = useMemo(
    () => data.filter((c) => c.trend_direction === 'FALLING').slice(0, 6),
    [data]
  );

  // Chart data — top 15 by win rate, ascending for Recharts horizontal bar
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.win_rate - a.win_rate)
        .slice(0, 15)
        .map((c) => {
          const full = c.comp_label || c.label;
          return {
            comp_id: c.comp_id,
            comp_label: full.length > 18 ? full.slice(0, 18) + '…' : full,
            full_label: full,
            win_rate_pct: parseFloat((c.win_rate * 100).toFixed(1)),
          };
        })
        .reverse(), // ascending so highest appears at top in vertical chart
    [data]
  );

  // DataTableCard columns
  const columns = useMemo<Column<RichComp>[]>(
    () => [
      {
        key: 'tier',
        title: 'Tier',
        width: 60,
        render: (_, rec) =>
          rec.tier ? (
            <TierBadge tier={rec.tier} size="sm" />
          ) : (
            <span className="text-text-secondary text-xs">—</span>
          ),
      },
      {
        key: 'label',
        title: 'Comp',
        render: (_, rec) => (
          <div className="flex items-center gap-2.5 min-w-0">
            {rec.trait_icons?.[0] && (
              <img
                src={rec.trait_icons[0]}
                alt=""
                className="w-5 h-5 rounded bg-black/50 border border-border/50 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="font-semibold text-text-primary truncate group-hover:text-accent-gold transition-colors">
              {rec.comp_label || rec.label}
            </span>
          </div>
        ),
      },
      {
        key: 'trend_direction',
        title: 'Trend',
        width: 100,
        align: 'center',
        render: (_, rec) => <TrendBadge direction={rec.trend_direction} />,
      },
      {
        key: 'win_rate',
        title: 'Win %',
        width: 80,
        align: 'right',
        sortable: true,
        render: (_, rec) => {
          const pct = rec.win_rate * 100;
          return (
            <span
              className={cn(
                'font-bold tabular-nums',
                pct >= 55 ? 'text-accent-green' : pct < 45 ? 'text-accent-red' : 'text-yellow-400'
              )}
            >
              {pct.toFixed(1)}%
            </span>
          );
        },
      },
      {
        key: 'top4_rate',
        title: 'Top 4 %',
        width: 90,
        align: 'right',
        sortable: true,
        render: (_, rec) => (
          <span className="text-text-primary font-medium tabular-nums">
            {(rec.top4_rate * 100).toFixed(1)}%
          </span>
        ),
      },
      {
        key: 'avg_placement',
        title: 'Avg Place',
        width: 90,
        align: 'right',
        sortable: true,
        render: (_, rec) => (
          <span className="text-text-primary font-mono tabular-nums text-xs">
            {rec.avg_placement.toFixed(2)}
          </span>
        ),
      },
      {
        key: 'sample_size',
        title: 'Games',
        width: 80,
        align: 'right',
        sortable: true,
        render: (_, rec) => (
          <span className="text-text-secondary font-mono text-xs tabular-nums">
            {rec.sample_size.toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* ── 1. Page Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Meta Trends</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Composition momentum over the last 24 hours
        </p>
      </div>

      {meta.error && <ErrorCard message="Failed to load trends" retry={() => meta.refetch()} />}

      {/* ── 2. Rising / Falling ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rising */}
        <TrendSection
          icon={<Flame size={18} className="text-orange-400" />}
          title="Rising"
          subtitle="Gaining momentum"
          headerClass="border-orange-500/20 bg-orange-500/5"
          comps={rising}
          direction="RISING"
          loading={meta.isLoading}
          emptyText="No rising comps detected this patch"
        />

        {/* Falling */}
        <TrendSection
          icon={<TrendingDown size={18} className="text-accent-red" />}
          title="Falling"
          subtitle="Losing momentum"
          headerClass="border-accent-red/20 bg-accent-red/5"
          comps={falling}
          direction="FALLING"
          loading={meta.isLoading}
          emptyText="No falling comps detected this patch"
        />
      </div>

      {/* ── 3. Win Rate Chart ─────────────────────────────────────────────── */}
      <ChartCard
        title="Top Win Rates"
        subtitle="Top 15 comps sorted by win rate"
        height={Math.max(320, chartData.length * 36)}
        loading={meta.isLoading}
        empty={!meta.isLoading && chartData.length === 0}
        emptyText="No chart data available"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
          >
            <defs>
              <linearGradient id="trendBarGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid {...defaultChartTheme.cartesianGrid} horizontal={false} vertical />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              {...defaultChartTheme.xAxis}
            />
            <YAxis
              type="category"
              dataKey="comp_label"
              width={150}
              tick={{ fill: '#e0e0e0', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#2a3040' }}
              tickLine={false}
            />
            <Tooltip
              {...defaultChartTheme.tooltip}
              formatter={(v: number | undefined) => [`${v ?? '—'}%`, 'Win Rate']}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.full_label ?? _label}
            />
            <Bar
              dataKey="win_rate_pct"
              fill="url(#trendBarGrad)"
              radius={[0, 4, 4, 0]}
              barSize={20}
              minPointSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 4. All Comps Table ────────────────────────────────────────────── */}
      <DataTableCard
        title="All Comps"
        subtitle="Full composition breakdown with trend data"
        columns={columns}
        data={data}
        rowKey="comp_id"
        loading={meta.isLoading}
        emptyText="No comp data available"
        searchable
        searchPlaceholder="Search comp name..."
        onRowClick={(rec) => navigate({ to: '/meta/$compId', params: { compId: rec.comp_id } })}
      />
    </div>
  );
}

// ── TrendSection ───────────────────────────────────────────────────────────────

interface TrendSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  headerClass: string;
  comps: RichComp[];
  direction: 'RISING' | 'FALLING';
  loading: boolean;
  emptyText: string;
}

function TrendSection({
  icon,
  title,
  subtitle,
  headerClass,
  comps,
  loading,
  emptyText,
}: TrendSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-card shadow-card overflow-hidden">
      {/* Card header */}
      <div
        className={cn('flex items-center gap-3 px-5 py-3.5 border-b border-border', headerClass)}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-card/60 shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-text-primary leading-snug">{title}</h2>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
        {!loading && (
          <span className="ml-auto text-xs font-semibold text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full border border-border shrink-0">
            {comps.length}
          </span>
        )}
      </div>

      {/* Comp list */}
      {loading ? (
        <ul className="divide-y divide-border/30">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="skeleton w-4 h-3 rounded-full shrink-0" />
              <div className="skeleton w-5 h-5 rounded shrink-0" />
              <div className="skeleton h-3 flex-1 rounded-full" />
              <div className="skeleton h-3 w-14 rounded-full shrink-0" />
              <div className="skeleton h-5 w-16 rounded-full shrink-0" />
            </li>
          ))}
        </ul>
      ) : comps.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-text-secondary">{emptyText}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {comps.map((c, idx) => (
            <li key={c.comp_id}>
              <Link
                to="/meta/$compId"
                params={{ compId: c.comp_id }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-bg-elevated/60 transition-colors group"
              >
                {/* Rank */}
                <span className="text-xs font-bold text-text-secondary w-4 tabular-nums shrink-0">
                  {idx + 1}
                </span>

                {/* Trait icon */}
                {c.trait_icons?.[0] ? (
                  <img
                    src={c.trait_icons[0]}
                    alt=""
                    className="w-5 h-5 rounded bg-black/50 border border-border/50 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-bg-elevated border border-border shrink-0" />
                )}

                {/* Comp name */}
                <span className="text-sm font-semibold text-text-primary truncate flex-1 group-hover:text-accent-gold transition-colors">
                  {c.comp_label || c.label}
                </span>

                {/* Win rate */}
                <span className="text-xs text-text-secondary tabular-nums shrink-0">
                  {(c.win_rate * 100).toFixed(1)}%
                </span>

                {/* Trend badge */}
                <TrendBadge direction={c.trend_direction} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
