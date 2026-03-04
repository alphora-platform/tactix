import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Globe, ArrowRightLeft, BarChart2, TrendingUp, Star, ChevronDown } from 'lucide-react';
import {
  useRegionalMetaQuery,
  useRegionalExclusiveQuery,
  useRegionCompareQuery,
} from '@/hooks/useAnalytics';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, defaultChartTheme } from '@/components/ui/ChartCard';
import { DataTableCard } from '@/components/ui/DataTableCard';
import type { Column } from '@/components/ui/DataTableCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils/cn';
import type {
  RegionalCompDto,
  RegionalExclusiveDto,
  CompHeadToHeadDto,
} from '@/lib/types/analytics.types';

// ── DataTable row types (need index signature for DataTableCard generic) ──────
type HeatmapRow = RegionalCompDto & { [k: string]: unknown };
type CompareRow = CompHeadToHeadDto & { [k: string]: unknown };

export const Route = createFileRoute('/regions/')({
  component: RegionsPage,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  KR: '#c89b3c', // accent-gold
  EUW: '#4fc3f7', // accent-blue
  NA: '#66bb6a', // accent-green
  EUNE: '#ef5350', // accent-red
  JP: '#ab47bc', // purple
  OCE: '#26c6da', // cyan
  BR: '#ff7043', // orange
  TR: '#ec407a', // pink
};

const ALL_REGIONS = ['KR', 'EUW', 'NA', 'EUNE', 'JP', 'OCE', 'BR', 'TR'];

type TabKey = 'divergence' | 'exclusive' | 'compare';

// Heatmap color: low WR=red, high WR=green via interpolation
function wrToHeatColor(wr: number): string {
  // wr is 0–1 decimal
  const pct = Math.min(1, Math.max(0, wr));
  if (pct >= 0.55) return '#66bb6a22'; // green tint
  if (pct >= 0.5) return '#c89b3c22'; // gold tint
  return '#ef535022'; // red tint
}
function wrToTextColor(wr: number): string {
  const pct = Math.min(1, Math.max(0, wr));
  if (pct >= 0.55) return '#66bb6a';
  if (pct >= 0.5) return '#c89b3c';
  return '#ef5350';
}

// ── Root page ─────────────────────────────────────────────────────────────────

function RegionsPage() {
  const [tab, setTab] = useState<TabKey>('divergence');
  const [regionA, setRegionA] = useState('KR');
  const [regionB, setRegionB] = useState('EUW');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'divergence', label: 'Regional Divergence' },
    { key: 'exclusive', label: 'Region Exclusives' },
    { key: 'compare', label: 'Head-to-Head' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Region Comparison</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          How the meta differs across global servers
        </p>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-border overflow-x-auto hide-scrollbar">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative shrink-0',
              tab === key
                ? 'text-accent-gold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent-gold'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {tab === 'divergence' && <DivergenceTab />}
      {tab === 'exclusive' && <ExclusiveTab />}
      {tab === 'compare' && (
        <CompareTab
          regionA={regionA}
          regionB={regionB}
          onRegionAChange={setRegionA}
          onRegionBChange={setRegionB}
        />
      )}
    </div>
  );
}

// ── DivergenceTab ─────────────────────────────────────────────────────────────

function DivergenceTab() {
  const regional = useRegionalMetaQuery();
  const exclusive = useRegionalExclusiveQuery();

  // Active region filter
  const availableRegions = regional.data?.regions ?? [];
  const [activeRegions, setActiveRegions] = useState<string[]>([]);

  const selectedRegions = activeRegions.length > 0 ? activeRegions : availableRegions;

  // Derived stats
  const maxDiffComp = useMemo(
    () =>
      regional.data?.comps.reduce(
        (best, c) => (c.regional_diff > (best?.regional_diff ?? 0) ? c : best),
        null as RegionalCompDto | null
      ),
    [regional.data]
  );

  // Table data — apply region filter (show subset of columns)
  const tableComps = useMemo<HeatmapRow[]>(
    () => (regional.data?.comps ?? []) as HeatmapRow[],
    [regional.data]
  );

  // Grouped bar chart — top 8 comps by global WR
  const chartData = useMemo(() => {
    if (!regional.data) return [];
    return [...regional.data.comps]
      .sort((a, b) => b.global_win_rate - a.global_win_rate)
      .slice(0, 8)
      .map((c) => {
        const name = c.label.length > 14 ? c.label.slice(0, 14) + '…' : c.label;
        const entry: Record<string, string | number> = { name };
        for (const region of selectedRegions.slice(0, 5)) {
          entry[region] = parseFloat(((c.by_region[region]?.win_rate ?? 0) * 100).toFixed(1));
        }
        return entry;
      });
  }, [regional.data, selectedRegions]);

  // Heatmap / table columns
  const heatmapColumns = useMemo<Column<HeatmapRow>[]>(() => {
    const regionCols: Column<HeatmapRow>[] = selectedRegions.slice(0, 6).map((region) => ({
      key: region,
      title: region,
      width: 72,
      align: 'center' as const,
      render: (_, rec) => {
        const stats = rec.by_region[region];
        if (!stats) return <span className="text-text-secondary/40 text-xs">—</span>;
        const wr = stats.win_rate;
        return (
          <span
            className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              color: wrToTextColor(wr),
              background: wrToHeatColor(wr),
            }}
          >
            {(wr * 100).toFixed(1)}%
          </span>
        );
      },
    }));

    return [
      {
        key: 'label',
        title: 'Comp',
        render: (_: unknown, rec: HeatmapRow) => (
          <span className="text-sm font-semibold text-text-primary truncate">{rec.label}</span>
        ),
      },
      {
        key: 'global_win_rate',
        title: 'Global WR',
        width: 82,
        align: 'right' as const,
        sortable: true,
        render: (_: unknown, rec: HeatmapRow) => (
          <span className="text-sm font-bold tabular-nums text-text-primary">
            {(rec.global_win_rate * 100).toFixed(1)}%
          </span>
        ),
      },
      ...regionCols,
      {
        key: 'regional_diff',
        title: 'Diff',
        width: 70,
        align: 'right' as const,
        sortable: true,
        render: (_: unknown, rec: HeatmapRow) => (
          <span
            className={cn(
              'text-xs font-bold tabular-nums',
              rec.regional_diff > 5
                ? 'text-accent-red'
                : rec.regional_diff > 2
                ? 'text-accent-gold'
                : 'text-text-secondary'
            )}
          >
            {rec.regional_diff.toFixed(1)}%
          </span>
        ),
      },
    ] satisfies Column<HeatmapRow>[];
  }, [selectedRegions]);

  const isLoading = regional.isLoading || exclusive.isLoading;

  return (
    <div className="space-y-5">
      {regional.error && (
        <ErrorCard message="Failed to load regional data" retry={() => regional.refetch()} />
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Regions Tracked"
          value={regional.data?.regions.length ?? '—'}
          subtitle="active servers"
          icon={Globe}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue/10"
          accentColor="border-l-accent-blue"
          loading={regional.isLoading}
        />
        <StatCard
          title="Comps Analyzed"
          value={regional.data?.comps.length ?? '—'}
          subtitle="this patch"
          icon={BarChart2}
          iconColor="text-accent-gold"
          iconBg="bg-accent-gold/10"
          accentColor="border-l-accent-gold"
          loading={regional.isLoading}
        />
        <StatCard
          title="Highest Divergence"
          value={maxDiffComp ? `${maxDiffComp.regional_diff.toFixed(1)}%` : '—'}
          subtitle={maxDiffComp?.label ?? 'comp name'}
          icon={TrendingUp}
          iconColor="text-accent-red"
          iconBg="bg-accent-red/10"
          accentColor="border-l-accent-red"
          loading={regional.isLoading}
        />
        <StatCard
          title="Region Exclusives"
          value={exclusive.data?.length ?? '—'}
          subtitle="region-specific picks"
          icon={Star}
          iconColor="text-accent-green"
          iconBg="bg-accent-green/10"
          accentColor="border-l-accent-green"
          loading={exclusive.isLoading}
        />
      </div>

      {/* ── Region filter chips ──────────────────────────────────────────────── */}
      {availableRegions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-text-secondary font-medium">Regions:</span>
          {availableRegions.map((r) => {
            const active = activeRegions.length === 0 || activeRegions.includes(r);
            return (
              <button
                key={r}
                onClick={() =>
                  setActiveRegions((prev) =>
                    prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                  )
                }
                className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full border transition-all',
                  active
                    ? 'border-transparent text-bg-primary'
                    : 'border-border text-text-secondary hover:border-border/80'
                )}
                style={active ? { background: REGION_COLORS[r] ?? '#9e9e9e' } : undefined}
              >
                {r}
              </button>
            );
          })}
          {activeRegions.length > 0 && (
            <button
              onClick={() => setActiveRegions([])}
              className="text-xs text-text-secondary hover:text-accent-gold transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* ── Grouped Bar Chart ────────────────────────────────────────────────── */}
      <ChartCard
        title="Win Rate by Region"
        subtitle="Top 8 comps — regional win rate comparison"
        height={300}
        loading={regional.isLoading}
        empty={!regional.isLoading && chartData.length === 0}
        emptyText="No regional data available"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 12, left: -20, bottom: 4 }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid {...defaultChartTheme.cartesianGrid} />
            <XAxis
              dataKey="name"
              {...defaultChartTheme.xAxis}
              tick={{ fill: '#9e9e9e', fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={44}
            />
            <YAxis {...defaultChartTheme.yAxis} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              {...defaultChartTheme.tooltip}
              formatter={(v: number | undefined) => [`${v ?? '—'}%`, '']}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9e9e9e' }} />
            {selectedRegions.slice(0, 5).map((region) => (
              <Bar
                key={region}
                dataKey={region}
                fill={REGION_COLORS[region] ?? '#9e9e9e'}
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Heatmap Table ────────────────────────────────────────────────────── */}
      <DataTableCard
        title="Regional Heatmap"
        subtitle="Win rate per region — color coded by performance"
        columns={heatmapColumns as unknown as Column<Record<string, unknown>>[]}
        data={tableComps as unknown as Record<string, unknown>[]}
        rowKey="comp_id"
        loading={isLoading}
        emptyText="No data available"
        searchable
        searchPlaceholder="Search comp..."
      />
    </div>
  );
}

// ── ExclusiveTab ──────────────────────────────────────────────────────────────

function ExclusiveTab() {
  const { data, isLoading, error, refetch } = useRegionalExclusiveQuery();

  return (
    <div className="space-y-4">
      {error && <ErrorCard message="Failed to load region exclusives" retry={() => refetch()} />}

      <p className="text-xs text-text-secondary">
        Comps with ≥50% win rate in one region but outperform other regions by at least 10pp —
        high-value region-specific picks.
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="skeleton h-4 flex-1 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-1 flex-1">
                    <div className="skeleton h-2.5 w-16 rounded-full" />
                    <div className="skeleton h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm">
          No region-exclusive picks found for this patch.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((comp) => (
            <ExclusiveCard key={comp.comp_id} comp={comp} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExclusiveCard({ comp }: { comp: RegionalExclusiveDto }) {
  const regionColor = REGION_COLORS[comp.strong_region] ?? '#9e9e9e';
  const advantage = comp.strong_win_rate - comp.other_regions_avg;

  return (
    <div
      className="rounded-xl border bg-bg-card shadow-card overflow-hidden"
      style={{ borderColor: `${regionColor}40` }}
    >
      {/* Top bar accent */}
      <div className="h-[2px]" style={{ background: regionColor }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="font-bold text-text-primary text-sm leading-snug min-w-0 truncate">
            {comp.label}
          </span>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap"
            style={{
              color: regionColor,
              background: `${regionColor}20`,
              border: `1px solid ${regionColor}40`,
            }}
          >
            {comp.strong_region}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-bg-elevated rounded-lg p-2.5">
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide mb-1 whitespace-nowrap">
              {comp.strong_region} WR
            </p>
            <p className="text-base font-bold tabular-nums" style={{ color: regionColor }}>
              {comp.strong_win_rate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-2.5">
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide mb-1 whitespace-nowrap">
              Others Avg
            </p>
            <p className="text-base font-bold tabular-nums text-text-secondary">
              {comp.other_regions_avg.toFixed(1)}%
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-2.5">
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide mb-1">
              Edge
            </p>
            <p className="text-base font-bold tabular-nums text-accent-green">
              +{advantage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Sample */}
        <p className="text-[10px] text-text-secondary mt-3 text-right tabular-nums">
          {comp.sample_size.toLocaleString()} games
        </p>
      </div>
    </div>
  );
}

// ── CompareTab ────────────────────────────────────────────────────────────────

const COMPARE_REGIONS = ALL_REGIONS;

function CompareTab({
  regionA,
  regionB,
  onRegionAChange,
  onRegionBChange,
}: {
  regionA: string;
  regionB: string;
  onRegionAChange: (v: string) => void;
  onRegionBChange: (v: string) => void;
}) {
  const { data, isLoading, error, refetch } = useRegionCompareQuery({ regionA, regionB });

  const colorA = REGION_COLORS[regionA] ?? '#9e9e9e';
  const colorB = REGION_COLORS[regionB] ?? '#9e9e9e';

  const selectClass =
    'appearance-none rounded-lg border border-border bg-bg-card pl-3 pr-8 py-2 text-sm font-semibold text-text-primary focus:border-accent-gold/60 focus:outline-none transition-colors cursor-pointer';

  // Table columns
  const compareColumns = useMemo<Column<CompareRow>[]>(
    () =>
      [
        {
          key: 'label',
          title: 'Comp',
          render: (_: unknown, rec: CompareRow) => (
            <span className="font-semibold text-text-primary text-sm truncate">{rec.label}</span>
          ),
        },
        {
          key: 'region_a_win_rate',
          title: regionA,
          width: 70,
          align: 'right' as const,
          sortable: true,
          render: (_: unknown, rec: CompareRow) => (
            <span className="font-bold tabular-nums text-sm" style={{ color: colorA }}>
              {rec.region_a_win_rate.toFixed(1)}%
            </span>
          ),
        },
        {
          key: 'region_b_win_rate',
          title: regionB,
          width: 70,
          align: 'right' as const,
          sortable: true,
          render: (_: unknown, rec: CompareRow) => (
            <span className="font-bold tabular-nums text-sm" style={{ color: colorB }}>
              {rec.region_b_win_rate.toFixed(1)}%
            </span>
          ),
        },
        {
          key: 'delta',
          title: 'Δ',
          width: 65,
          align: 'right' as const,
          sortable: true,
          render: (_: unknown, rec: CompareRow) => (
            <span
              className={cn(
                'font-bold tabular-nums text-sm',
                rec.delta > 0
                  ? 'text-accent-green'
                  : rec.delta < 0
                  ? 'text-accent-red'
                  : 'text-text-secondary'
              )}
            >
              {rec.delta > 0 ? '+' : ''}
              {rec.delta.toFixed(1)}%
            </span>
          ),
        },
        {
          key: 'winner',
          title: 'Winner',
          width: 70,
          align: 'center' as const,
          render: (_: unknown, rec: CompareRow) =>
            rec.winner === 'TIED' ? (
              <span className="text-text-secondary text-xs">—</span>
            ) : (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: REGION_COLORS[rec.winner] ?? '#9e9e9e',
                  background: `${REGION_COLORS[rec.winner] ?? '#9e9e9e'}20`,
                }}
              >
                {rec.winner}
              </span>
            ),
        },
      ] satisfies Column<CompareRow>[],
    [regionA, regionB, colorA, colorB]
  );

  return (
    <div className="space-y-5">
      {/* Region pickers */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative">
          <select
            value={regionA}
            onChange={(e) => onRegionAChange(e.target.value)}
            className={selectClass}
            style={{ borderColor: `${colorA}60`, color: colorA }}
          >
            {COMPARE_REGIONS.filter((r) => r !== regionB).map((r) => (
              <option key={r} value={r} style={{ color: '#e0e0e0' }}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
        </div>

        <div className="flex items-center justify-center">
          <ArrowRightLeft size={16} className="text-text-secondary rotate-90 sm:rotate-0" />
        </div>

        <div className="relative">
          <select
            value={regionB}
            onChange={(e) => onRegionBChange(e.target.value)}
            className={selectClass}
            style={{ borderColor: `${colorB}60`, color: colorB }}
          >
            {COMPARE_REGIONS.filter((r) => r !== regionA).map((r) => (
              <option key={r} value={r} style={{ color: '#e0e0e0' }}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
        </div>
      </div>

      {error && <ErrorCard message="Failed to compare regions" retry={() => refetch()} />}

      {/* Meta Similarity */}
      {(data || isLoading) && (
        <div className="rounded-xl border border-border bg-bg-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center shrink-0">
                <Globe size={20} className="text-accent-blue" />
              </div>
              <div>
                <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">
                  Meta Similarity
                </p>
                {isLoading ? (
                  <div className="skeleton h-7 w-20 rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-text-primary">
                    {(data!.meta_similarity * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
            {!isLoading && data && (
              <p className="text-sm text-text-secondary max-w-xs">
                {data.meta_similarity > 0.85
                  ? 'These regions share a very similar meta.'
                  : data.meta_similarity > 0.65
                  ? 'Moderate meta divergence between regions.'
                  : 'Significantly different metas — check exclusives!'}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {!isLoading && data && (
            <div className="mt-4">
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(data.meta_similarity * 100).toFixed(1)}%`,
                    background:
                      data.meta_similarity > 0.75
                        ? '#66bb6a'
                        : data.meta_similarity > 0.55
                        ? '#c89b3c'
                        : '#ef5350',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Head-to-head table */}
      {data && (
        <DataTableCard
          title={`${regionA} vs ${regionB}`}
          subtitle="Per-comp win rate comparison"
          columns={compareColumns as unknown as Column<Record<string, unknown>>[]}
          data={data.comps as unknown as Record<string, unknown>[]}
          rowKey="comp_id"
          loading={isLoading}
          emptyText="No comparison data available"
          searchable
          searchPlaceholder="Search comp..."
        />
      )}
    </div>
  );
}
