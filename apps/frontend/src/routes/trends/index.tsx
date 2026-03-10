import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMetaQuery } from '@/hooks/useAnalytics';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts';
import { Flame, TrendingDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { cn } from '@/lib/utils/cn';
import type { CompStatDto } from '@/lib/types/analytics.types';
import { resolveCompName } from '@/lib/utils/compName';
import { useTraits } from '@/lib/hooks/useMetadata';
import { EmptyState } from '@/components/ui/EmptyState';
import { TierBadge } from '@/components/ui/TierBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatWinRate, getPlacementColor, getWinRateColor } from '@/lib/utils/display.utils';

export const Route = createFileRoute('/trends/')({
  component: TrendsPage,
});

type RichComp = CompStatDto & {
  comp_label?: string;
  trait_icons?: string[];
};

type MomentumDirection = 'RISING' | 'FALLING';

interface TrendChartRow {
  comp_id: string;
  comp_name: string;
  win_rate_pct: number;
  top4_rate_pct: number;
  avg_placement: number;
  sample_size: number;
}

function getWinRateDelta(comp: RichComp): number | null {
  const possible = [
    (comp as Record<string, unknown>).win_rate_delta,
    (comp as Record<string, unknown>).win_rate_change,
    (comp as Record<string, unknown>).trend_delta,
    (comp as Record<string, unknown>).delta,
  ];

  for (const value of possible) {
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    return Math.abs(value) <= 1 ? value * 100 : value;
  }

  return null;
}

function toTierValue(tier?: string): 'S' | 'A' | 'B' | 'C' | null {
  const normalized = (tier ?? '').toUpperCase();
  if (normalized === 'S' || normalized === 'A' || normalized === 'B' || normalized === 'C') {
    return normalized;
  }
  return null;
}

function trendTag(direction?: string) {
  if (direction === 'RISING') return <Tag color="success">RISING</Tag>;
  if (direction === 'FALLING') return <Tag color="error">FALLING</Tag>;
  return <Tag>STABLE</Tag>;
}

function truncateLabel(label: string, max = 20): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-100">{row.comp_name}</p>
      <div className="mt-1 space-y-0.5 text-xs text-slate-400">
        <p>
          Win Rate:{' '}
          <span className={cn('font-medium tabular-nums', getWinRateColor(row.win_rate_pct))}>
            {formatWinRate(row.win_rate_pct)}
          </span>
        </p>
        <p>
          Top 4: <span className="font-medium tabular-nums text-emerald-300">{row.top4_rate_pct.toFixed(1)}%</span>
        </p>
        <p>
          Avg Place: <span className="font-medium tabular-nums text-slate-200">{row.avg_placement.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

function TrendsPage() {
  const meta = useMetaQuery(30);
  const navigate = useNavigate();
  const { data: traits } = useTraits();

  const [tableSearch, setTableSearch] = useState('');

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

  const rising = useMemo(
    () => data.filter((comp) => comp.trend_direction === 'RISING').slice(0, 6),
    [data]
  );

  const falling = useMemo(
    () => data.filter((comp) => comp.trend_direction === 'FALLING').slice(0, 6),
    [data]
  );

  const chartData = useMemo<TrendChartRow[]>(
    () =>
      [...data]
        .sort((a, b) => b.win_rate - a.win_rate)
        .slice(0, 15)
        .map((comp) => ({
          comp_id: comp.comp_id,
          comp_name: resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits),
          win_rate_pct: Number((comp.win_rate * 100).toFixed(1)),
          top4_rate_pct: Number((comp.top4_rate * 100).toFixed(1)),
          avg_placement: comp.avg_placement,
          sample_size: comp.sample_size,
        })),
    [data, traits]
  );

  const filteredTableData = useMemo(() => {
    if (!tableSearch.trim()) return data;

    const query = tableSearch.trim().toLowerCase();
    return data.filter((comp) => {
      const name = resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits);
      return name.toLowerCase().includes(query);
    });
  }, [data, tableSearch, traits]);

  const tableColumns = useMemo<TableProps<RichComp>['columns']>(
    () => [
      {
        title: 'TIER',
        dataIndex: 'tier',
        key: 'tier',
        width: 82,
        render: (tier: string | undefined) => {
          const value = toTierValue(tier);
          if (!value) return <span className="text-xs text-slate-500">-</span>;
          return <TierBadge tier={value} size="sm" />;
        },
      },
      {
        title: 'COMP',
        dataIndex: 'label',
        key: 'comp',
        width: 220,
        render: (_: unknown, rec: RichComp) => (
          <div className="flex min-w-[200px] items-center gap-2.5">
            {rec.trait_icons?.[0] ? (
              <img
                src={rec.trait_icons[0]}
                alt=""
                className="h-5 w-5 shrink-0 rounded border border-[var(--border-subtle)] bg-black/50"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="h-5 w-5 shrink-0 rounded bg-[var(--bg-overlay)]/70" />
            )}
            <span className="truncate font-medium text-slate-100">
              {resolveCompName(rec.comp_id, rec.comp_label || rec.label, traits)}
            </span>
          </div>
        ),
      },
      {
        title: 'TREND',
        dataIndex: 'trend_direction',
        key: 'trend',
        width: 120,
        align: 'center',
        render: (direction: string | undefined) => trendTag(direction),
      },
      {
        title: 'WIN %',
        dataIndex: 'win_rate',
        key: 'win_rate',
        width: 100,
        align: 'right',
        sorter: (a, b) => a.win_rate - b.win_rate,
        render: (value: number) => {
          return (
            <span className={cn('font-semibold tabular-nums', getWinRateColor(value))}>
              {formatWinRate(value)}
            </span>
          );
        },
      },
      {
        title: 'TOP 4 %',
        dataIndex: 'top4_rate',
        key: 'top4_rate',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.top4_rate - b.top4_rate,
        render: (value: number) => {
          return (
            <span className={cn('font-semibold tabular-nums', getWinRateColor(value))}>
              {formatWinRate(value)}
            </span>
          );
        },
      },
      {
        title: 'AVG PLACE',
        dataIndex: 'avg_placement',
        key: 'avg_placement',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.avg_placement - b.avg_placement,
        render: (value: number) => (
          <span className={cn('font-semibold tabular-nums', getPlacementColor(Math.round(value)))}>
            {value.toFixed(2)}
          </span>
        ),
      },
      {
        title: 'GAMES',
        dataIndex: 'sample_size',
        key: 'sample_size',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.sample_size - b.sample_size,
        render: (value: number) => <span className="tabular-nums text-slate-400">{value.toLocaleString()}</span>,
      },
    ],
    [traits]
  );

  const tableClass =
    '[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-surface)] [&_.ant-table-thead>tr>th]:!text-slate-300 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent [&_.ant-table-placeholder]:!bg-transparent [&_.ant-pagination-item]:!border-[var(--border-default)] [&_.ant-pagination-item>a]:!text-slate-300 [&_.ant-pagination-item-active]:!border-blue-500 [&_.ant-pagination-item-active>a]:!text-blue-400';

  const virtualEnabled = filteredTableData.length > 50;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Meta Trends" subtitle="Composition momentum over the last 24 hours" />

      {meta.error && <ErrorCard message="Failed to load trends" retry={() => meta.refetch()} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <MomentumCard
          icon={<Flame size={18} className="text-orange-400" />}
          title="Rising"
          subtitle="Gaining momentum"
          direction="RISING"
          comps={rising}
          loading={meta.isLoading}
          emptyDescription="No rising comps detected this patch"
          borderClass="border-l-orange-500"
        />

        <MomentumCard
          icon={<TrendingDown size={18} className="text-blue-400" />}
          title="Falling"
          subtitle="Losing momentum"
          direction="FALLING"
          comps={falling}
          loading={meta.isLoading}
          emptyDescription="No falling comps detected this patch"
          borderClass="border-l-blue-400"
        />
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Top Win Rates</h2>
          <p className="mt-1 text-sm text-slate-400">Top 15 comps sorted by win rate</p>
        </div>

        {meta.isLoading ? (
          <div className="h-[350px] animate-pulse rounded-lg bg-[var(--bg-elevated)]/70" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center">
            <EmptyState title="No chart data available" />
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 34, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} vertical />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="comp_name"
                  width={180}
                  tickFormatter={(value: string) => truncateLabel(value, 20)}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickLine={false}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="win_rate_pct" fill="url(#blueGradient)" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((row) => (
                    <Cell key={row.comp_id} fill="url(#blueGradient)" />
                  ))}
                  <LabelList
                    dataKey="win_rate_pct"
                    position="right"
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    fill="var(--text-primary)"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">All Comps</h2>
            <p className="mt-1 text-sm text-slate-400">Full composition breakdown with trend data</p>
          </div>
          <Input.Search
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            onSearch={(value) => setTableSearch(value)}
            allowClear
            placeholder="Search comp name..."
            size="large"
            className="w-full sm:w-80 [&_.ant-input]:!border-[var(--border-default)] [&_.ant-input]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400 [&_.ant-input-search-button]:!border-[var(--border-default)] [&_.ant-input-search-button]:!bg-[var(--bg-elevated)] [&_.ant-input-search-button]:!text-slate-200"
          />
        </div>

        <Table
          rowKey="comp_id"
          columns={tableColumns}
          dataSource={filteredTableData}
          loading={meta.isLoading}
          sticky
          virtual={virtualEnabled}
          scroll={virtualEnabled ? { y: 560, x: 1000 } : { x: 1000 }}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          locale={{ emptyText: <EmptyState title="No comp data available" /> }}
          className={tableClass}
          onRow={(record) => ({
            onClick: () => navigate({ to: '/meta/$compId', params: { compId: record.comp_id } }),
            className: 'cursor-pointer hover:!bg-white/5',
          })}
        />
      </div>
    </div>
  );
}

function MomentumCard({
  icon,
  title,
  subtitle,
  direction,
  comps,
  loading,
  emptyDescription,
  borderClass,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  direction: MomentumDirection;
  comps: RichComp[];
  loading: boolean;
  emptyDescription: string;
  borderClass: string;
}) {
  const { data: traits } = useTraits();

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border-default)] border-l-4 bg-[var(--bg-surface)] shadow-card',
        borderClass
      )}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)]">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse px-5 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="mb-1.5 h-3 w-2/3 rounded-full bg-[var(--bg-overlay)]/70" />
              <div className="h-2.5 w-20 rounded-full bg-[var(--bg-overlay)]/60" />
            </div>
          ))}
        </div>
      ) : comps.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState title="No comps found" description={emptyDescription} />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {comps.map((comp) => {
            const delta = getWinRateDelta(comp);
            const badgeText =
              delta != null
                ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`
                : direction === 'RISING'
                  ? '+'
                  : '-';
            const badgeClass = direction === 'RISING' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-300 bg-rose-500/10 border-rose-500/30';

            return (
              <li key={comp.comp_id}>
                <Link
                  to="/meta/$compId"
                  params={{ compId: comp.comp_id }}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/5"
                >
                  <span className="truncate text-sm font-medium text-slate-100">
                    {resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits)}
                  </span>
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums', badgeClass)}>
                    {badgeText}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
