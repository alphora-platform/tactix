import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Tabs, Checkbox, Input, Table } from 'antd';
import type { TableProps } from 'antd';
import { Globe, ArrowRightLeft, BarChart3, TrendingUp, Star, ChevronDown } from 'lucide-react';
import {
  useRegionalMetaQuery,
  useRegionalExclusiveQuery,
  useRegionCompareQuery,
} from '@/hooks/useAnalytics';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
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
import { resolveCompName } from '@/lib/utils/compName';
import { formatWinRate, getWinRateColor } from '@/lib/utils/display.utils';
import { useTraits } from '@/lib/hooks/useMetadata';
import type {
  RegionalCompDto,
  RegionalExclusiveDto,
  CompHeadToHeadDto,
} from '@/lib/types/analytics.types';

interface HeatmapTableRow extends RegionalCompDto {
  display_name: string;
  normalized_global_wr: number;
  diff_pct: number;
}

type CompareRow = CompHeadToHeadDto;

export const Route = createFileRoute('/regions/')({
  component: RegionsPage,
});

const REGION_COLORS: Record<string, string> = {
  KR: '#3B82F6',
  EUW: '#22c55e',
  NA: '#f59e0b',
  EUNE: '#ef4444',
  JP: '#a855f7',
  OCE: '#06b6d4',
  BR: '#f97316',
  TR: '#ec4899',
};

const ALL_REGIONS = ['KR', 'EUW', 'NA', 'EUNE', 'JP', 'OCE', 'BR', 'TR'];
type TabKey = 'divergence' | 'exclusive' | 'compare';

const TABLE_CLASS =
  '[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-surface)] [&_.ant-table-thead>tr>th]:!text-slate-300 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent [&_.ant-table-placeholder]:!bg-transparent [&_.ant-pagination-item]:!border-[var(--border-default)] [&_.ant-pagination-item>a]:!text-slate-300 [&_.ant-pagination-item-active]:!border-blue-500 [&_.ant-pagination-item-active>a]:!text-blue-400';

function normalizeRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

function normalizeDiffPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function RegionsPage() {
  const [tab, setTab] = useState<TabKey>('divergence');
  const [regionA, setRegionA] = useState('KR');
  const [regionB, setRegionB] = useState('EUW');

  const tabItems = [
    {
      key: 'divergence',
      label: 'Regional Divergence',
      children: <DivergenceTab />,
    },
    {
      key: 'exclusive',
      label: 'Region Exclusives',
      children: <ExclusiveTab />,
    },
    {
      key: 'compare',
      label: 'Head-to-Head',
      children: (
        <CompareTab
          regionA={regionA}
          regionB={regionB}
          onRegionAChange={setRegionA}
          onRegionBChange={setRegionB}
        />
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Region Comparison" subtitle="How the meta differs across global servers" />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={tabItems}
        type="line"
        size="middle"
        className="[&_.ant-tabs-tab]:!text-slate-400 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-blue-400 [&_.ant-tabs-ink-bar]:!bg-blue-500"
      />
    </div>
  );
}

function DivergenceTab() {
  const regional = useRegionalMetaQuery();
  const exclusive = useRegionalExclusiveQuery();
  const { data: traits } = useTraits();

  const [activeRegions, setActiveRegions] = useState<string[]>([]);
  const [heatmapSearch, setHeatmapSearch] = useState('');

  const availableRegions = regional.data?.regions ?? [];
  const selectedRegions = activeRegions.length > 0 ? activeRegions : availableRegions;

  const allRows = useMemo<HeatmapTableRow[]>(() => {
    return (regional.data?.comps ?? []).map((comp) => ({
      ...comp,
      display_name: resolveCompName(comp.comp_id, comp.label, traits),
      normalized_global_wr: normalizeRate(comp.global_win_rate),
      diff_pct: normalizeDiffPercent(comp.regional_diff),
    }));
  }, [regional.data, traits]);

  const filteredRows = useMemo(() => {
    if (!heatmapSearch.trim()) return allRows;

    const query = heatmapSearch.trim().toLowerCase();
    return allRows.filter((row) => row.display_name.toLowerCase().includes(query));
  }, [allRows, heatmapSearch]);

  const maxDiffComp = useMemo(
    () =>
      allRows.reduce(
        (best, row) => (Math.abs(row.diff_pct) > Math.abs(best?.diff_pct ?? -1) ? row : best),
        null as HeatmapTableRow | null
      ),
    [allRows]
  );

  const chartData = useMemo(() => {
    return [...allRows]
      .sort((a, b) => b.normalized_global_wr - a.normalized_global_wr)
      .slice(0, 8)
      .map((row) => {
        const entry: Record<string, string | number> = {
          name: row.display_name,
        };

        for (const region of selectedRegions.slice(0, 5)) {
          const wr = normalizeRate(row.by_region[region]?.win_rate ?? 0);
          entry[region] = Number((wr * 100).toFixed(1));
        }

        return entry;
      });
  }, [allRows, selectedRegions]);

  const heatmapColumns = useMemo<TableProps<HeatmapTableRow>['columns']>(() => {
    const regionCols = selectedRegions.slice(0, 6).map((region) => ({
      title: region,
      key: region,
      dataIndex: region,
      width: 100,
      align: 'center' as const,
      render: (_: unknown, rec: HeatmapTableRow) => {
        const stats = rec.by_region[region];
        if (!stats) return <span className="text-xs text-text-secondary/40">-</span>;

        const wr = normalizeRate(stats.win_rate);
        return (
          <span className={cn('text-xs font-semibold tabular-nums', getWinRateColor(wr))}>
            {formatWinRate(wr)}
          </span>
        );
      },
      onCell: (rec: HeatmapTableRow) => {
        const stats = rec.by_region[region];
        if (!stats) return {};

        const wr = normalizeRate(stats.win_rate);
        const delta = wr - rec.normalized_global_wr;

        if (!['KR', 'EUW', 'NA'].includes(region)) {
          return {};
        }

        const isAbove = delta >= 0;

        return {
          style: {
            backgroundColor: isAbove ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)',
            color: isAbove ? '#4ade80' : '#fb7185',
          },
        };
      },
    }));

    return [
      {
        title: 'COMP',
        key: 'display_name',
        dataIndex: 'display_name',
        fixed: 'left',
        width: 220,
        render: (value: string) => <span className="font-medium text-slate-100">{value}</span>,
      },
      {
        title: 'GLOBAL WR',
        key: 'normalized_global_wr',
        dataIndex: 'normalized_global_wr',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.normalized_global_wr - b.normalized_global_wr,
        render: (value: number) => (
          <span className={cn('tabular-nums', getWinRateColor(value))}>{formatWinRate(value)}</span>
        ),
      },
      ...regionCols,
      {
        title: 'DIFF',
        key: 'diff_pct',
        dataIndex: 'diff_pct',
        width: 95,
        align: 'right',
        sorter: (a, b) => a.diff_pct - b.diff_pct,
        render: (value: number) => (
          <span
            className={cn(
              'font-semibold tabular-nums',
              value >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {value >= 0 ? '+' : ''}
            {value.toFixed(1)}%
          </span>
        ),
      },
    ];
  }, [selectedRegions]);

  const isLoading = regional.isLoading || exclusive.isLoading;

  const checkboxValue = selectedRegions;

  return (
    <div className="space-y-5">
      {regional.error && (
        <ErrorCard message="Failed to load regional data" retry={() => regional.refetch()} />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Regions Tracked"
          value={regional.data?.regions.length ?? '-'}
          subtitle="active servers"
          icon={Globe}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          accentColor="border-l-blue-500"
          loading={regional.isLoading}
        />
        <StatCard
          title="Comps Analyzed"
          value={regional.data?.comps.length ?? '-'}
          subtitle="this patch"
          icon={BarChart3}
          iconColor="text-slate-300"
          iconBg="bg-slate-500/10"
          accentColor="border-l-slate-500"
          loading={regional.isLoading}
        />
        <StatCard
          title="Highest Divergence"
          value={maxDiffComp ? `${Math.abs(maxDiffComp.diff_pct).toFixed(1)}%` : '-'}
          subtitle={maxDiffComp?.display_name ?? 'comp name'}
          icon={TrendingUp}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          accentColor="border-l-orange-500"
          loading={regional.isLoading}
        />
        <StatCard
          title="Region Exclusives"
          value={exclusive.data?.length ?? '-'}
          subtitle="region-specific picks"
          icon={Star}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          accentColor="border-l-violet-500"
          loading={exclusive.isLoading}
        />
      </div>

      {availableRegions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">Regions</p>
          <Checkbox.Group
            value={checkboxValue}
            onChange={(values) => {
              const next = values as string[];
              if (next.length === availableRegions.length) {
                setActiveRegions([]);
              } else {
                setActiveRegions(next);
              }
            }}
          >
            <div className="flex flex-wrap gap-2">
              {availableRegions.map((region) => {
                const checked = checkboxValue.includes(region);
                const color = REGION_COLORS[region] ?? '#64748b';

                return (
                  <label key={region} className="cursor-pointer">
                    <Checkbox value={region} className="!hidden" />
                    <span
                      className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                      style={
                        checked
                          ? {
                              borderColor: color,
                              backgroundColor: color,
                              color: '#020617',
                            }
                          : {
                              borderColor: `${color}99`,
                              color,
                              backgroundColor: 'transparent',
                            }
                      }
                    >
                      {region}
                    </span>
                  </label>
                );
              })}
            </div>
          </Checkbox.Group>
        </div>
      )}

      <ChartCard
        title="Win Rate by Region"
        subtitle="Top 8 comps - regional win rate comparison"
        height={320}
        loading={regional.isLoading}
        empty={!regional.isLoading && chartData.length === 0}
        emptyText="No regional data available"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: -14, bottom: 36 }}
            barGap={3}
            barCategoryGap="22%"
          >
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
              width={40}
            />
            <Tooltip formatter={(v: number | undefined) => [formatWinRate(v ?? 0), '']} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11 }} />

            {selectedRegions.slice(0, 5).map((region) => (
              <Bar
                key={region}
                dataKey={region}
                name={region}
                fill={REGION_COLORS[region] ?? '#94a3b8'}
                fillOpacity={0.9}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Regional Heatmap</h2>
            <p className="mt-1 text-sm text-slate-400">
              Win rate per region - color coded against global average
            </p>
          </div>
          <Input.Search
            value={heatmapSearch}
            onChange={(e) => setHeatmapSearch(e.target.value)}
            onSearch={(value) => setHeatmapSearch(value)}
            allowClear
            placeholder="Search comp..."
            size="large"
            className="w-full sm:w-80 [&_.ant-input]:!border-[var(--border-default)] [&_.ant-input]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400 [&_.ant-input-search-button]:!border-[var(--border-default)] [&_.ant-input-search-button]:!bg-[var(--bg-elevated)] [&_.ant-input-search-button]:!text-slate-200"
          />
        </div>

        {isLoading ? (
          <SkeletonCard rows={10} showHeader />
        ) : (
          <Table
            rowKey="comp_id"
            columns={heatmapColumns}
            dataSource={filteredRows}
            sticky
            scroll={{ x: 1100 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{
              emptyText: (
                <EmptyState
                  title="No regional heatmap data"
                  description="Try another patch or adjust selected regions."
                />
              ),
            }}
            className={TABLE_CLASS}
          />
        )}
      </div>
    </div>
  );
}

function ExclusiveTab() {
  const { data, isLoading, error, refetch } = useRegionalExclusiveQuery();
  const { data: traits } = useTraits();

  return (
    <div className="space-y-4">
      {error && <ErrorCard message="Failed to load region exclusives" retry={() => refetch()} />}

      <p className="text-xs text-text-secondary">
        Comps with &gt;=50% win rate in one region but outperform other regions by at least 10pp -
        high-value region-specific picks.
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="skeleton h-4 flex-1 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                {[...Array(3)].map((__, j) => (
                  <div key={j} className="flex-1 space-y-1">
                    <div className="skeleton h-2.5 w-16 rounded-full" />
                    <div className="skeleton h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-secondary">
          No region-exclusive picks found for this patch.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((comp) => (
            <ExclusiveCard key={comp.comp_id} comp={comp} traits={traits} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExclusiveCard({
  comp,
  traits,
}: {
  comp: RegionalExclusiveDto;
  traits?: ReturnType<typeof useTraits>['data'];
}) {
  const regionColor = REGION_COLORS[comp.strong_region] ?? '#9e9e9e';
  const advantage = comp.strong_win_rate - comp.other_regions_avg;
  const displayName = resolveCompName(comp.comp_id, comp.label, traits);

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-card"
      style={{ borderColor: `${regionColor}40` }}
    >
      <div className="h-0.5" style={{ background: regionColor }} />

      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-bold leading-snug text-text-primary">
            {displayName}
          </span>
          <span
            className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              color: regionColor,
              background: `${regionColor}20`,
              border: `1px solid ${regionColor}40`,
            }}
          >
            {comp.strong_region}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-bg-elevated p-2.5">
            <p className="mb-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              {comp.strong_region} WR
            </p>
            <p className="text-base font-bold tabular-nums" style={{ color: regionColor }}>
              {formatWinRate(comp.strong_win_rate)}
            </p>
          </div>
          <div className="rounded-lg bg-bg-elevated p-2.5">
            <p className="mb-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              Others Avg
            </p>
            <p className="text-base font-bold tabular-nums text-text-secondary">
              {formatWinRate(comp.other_regions_avg)}
            </p>
          </div>
          <div className="rounded-lg bg-bg-elevated p-2.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              Edge
            </p>
            <p className="text-base font-bold tabular-nums text-accent-green">
              +{advantage.toFixed(1)}%
            </p>
          </div>
        </div>

        <p className="mt-3 text-right text-[10px] tabular-nums text-text-secondary">
          {comp.sample_size.toLocaleString()} games
        </p>
      </div>
    </div>
  );
}

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
  const { data: traits } = useTraits();

  const colorA = REGION_COLORS[regionA] ?? '#9e9e9e';
  const colorB = REGION_COLORS[regionB] ?? '#9e9e9e';

  const selectClass =
    'appearance-none cursor-pointer rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 pl-3 pr-8 text-sm font-semibold text-text-primary transition-colors focus:border-accent-gold/60 focus:outline-none';

  const compareColumns = useMemo<TableProps<CompareRow>['columns']>(
    () => [
      {
        title: 'Comp',
        key: 'label',
        dataIndex: 'label',
        render: (_: unknown, rec: CompareRow) => (
          <span className="truncate text-sm font-semibold text-text-primary">
            {resolveCompName(rec.comp_id, rec.label, traits)}
          </span>
        ),
      },
      {
        title: regionA,
        key: 'region_a_win_rate',
        dataIndex: 'region_a_win_rate',
        width: 84,
        align: 'right',
        sorter: (a, b) => a.region_a_win_rate - b.region_a_win_rate,
        render: (value: number) => (
          <span className={cn('text-sm font-bold tabular-nums', getWinRateColor(value))}>
            {formatWinRate(value)}
          </span>
        ),
      },
      {
        title: regionB,
        key: 'region_b_win_rate',
        dataIndex: 'region_b_win_rate',
        width: 84,
        align: 'right',
        sorter: (a, b) => a.region_b_win_rate - b.region_b_win_rate,
        render: (value: number) => (
          <span className={cn('text-sm font-bold tabular-nums', getWinRateColor(value))}>
            {formatWinRate(value)}
          </span>
        ),
      },
      {
        title: 'Δ',
        key: 'delta',
        dataIndex: 'delta',
        width: 80,
        align: 'right',
        sorter: (a, b) => a.delta - b.delta,
        render: (value: number) => (
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              value > 0
                ? 'text-accent-green'
                : value < 0
                ? 'text-accent-red'
                : 'text-text-secondary'
            )}
          >
            {value > 0 ? '+' : ''}
            {value.toFixed(1)}%
          </span>
        ),
      },
      {
        title: 'Winner',
        key: 'winner',
        dataIndex: 'winner',
        width: 86,
        align: 'center',
        render: (winner: string) =>
          winner === 'TIED' ? (
            <span className="text-xs text-text-secondary">-</span>
          ) : (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                color: REGION_COLORS[winner] ?? '#9e9e9e',
                background: `${REGION_COLORS[winner] ?? '#9e9e9e'}20`,
              }}
            >
              {winner}
            </span>
          ),
      },
    ],
    [regionA, regionB, colorA, colorB, traits]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <select
            value={regionA}
            onChange={(e) => onRegionAChange(e.target.value)}
            className={selectClass}
            style={{ borderColor: `${colorA}60`, color: colorA }}
          >
            {COMPARE_REGIONS.filter((r) => r !== regionB).map((region) => (
              <option key={region} value={region} style={{ color: '#e0e0e0' }}>
                {region}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
          />
        </div>

        <div className="flex items-center justify-center">
          <ArrowRightLeft size={16} className="rotate-90 text-text-secondary sm:rotate-0" />
        </div>

        <div className="relative">
          <select
            value={regionB}
            onChange={(e) => onRegionBChange(e.target.value)}
            className={selectClass}
            style={{ borderColor: `${colorB}60`, color: colorB }}
          >
            {COMPARE_REGIONS.filter((r) => r !== regionA).map((region) => (
              <option key={region} value={region} style={{ color: '#e0e0e0' }}>
                {region}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
          />
        </div>
      </div>

      {error && <ErrorCard message="Failed to compare regions" retry={() => refetch()} />}

      {(data || isLoading) && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-blue/30 bg-accent-blue/10">
                <Globe size={20} className="text-accent-blue" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Meta Similarity
                </p>
                {isLoading ? (
                  <div className="skeleton mt-1 h-7 w-20 rounded" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-text-primary">
                    {(data!.meta_similarity * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
            {!isLoading && data && (
              <p className="max-w-xs text-sm text-text-secondary">
                {data.meta_similarity > 0.85
                  ? 'These regions share a very similar meta.'
                  : data.meta_similarity > 0.65
                  ? 'Moderate meta divergence between regions.'
                  : 'Significantly different metas - check exclusives!'}
              </p>
            )}
          </div>

          {!isLoading && data && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full border border-border/50 bg-bg-elevated">
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

      {data && (
        <Table
          rowKey="comp_id"
          columns={compareColumns}
          dataSource={data.comps}
          loading={isLoading}
          sticky
          scroll={{ x: 860 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText: (
              <EmptyState
                title="No comparison data available"
                description="No matching comps were found for this region pair."
              />
            ),
          }}
          className={TABLE_CLASS}
        />
      )}
    </div>
  );
}
