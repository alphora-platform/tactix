import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Input, Select } from 'antd';
import { Layers, Star, TrendingUp, Flame, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMetaQuery, useTierListQuery } from '@/hooks/useAnalytics';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompCardSkeletonGrid } from '@/components/ui/CompCard.skeleton';
import { TierBadge } from '@/components/ui/TierBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import { resolveCompName } from '@/lib/utils/compName';
import {
  formatWinRate,
  getPlacementColor,
  getTierConfig,
  getWinRateColor,
} from '@/lib/utils/display.utils';
import { useTraits } from '@/lib/hooks/useMetadata';
import type { CompStatDto, TierCompEntry, Tier } from '@/lib/types/analytics.types';

export const Route = createFileRoute('/meta/')({
  component: MetaOverviewPage,
});

type RichCompStatDto = CompStatDto;
type SortKey = 'winRate' | 'top4Rate' | 'avgPlacement' | 'games';

const SORT_OPTIONS = [
  { label: 'Win Rate', value: 'winRate' },
  { label: 'Top 4 Rate', value: 'top4Rate' },
  { label: 'Avg Placement', value: 'avgPlacement' },
  { label: 'Games', value: 'games' },
] as const;

interface TraitChip {
  key: string;
  name: string;
  count: number | null;
  icon?: string;
}

function truncateLabel(label: string, max = 20): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function interpolateBlueToGreen(value: number, min: number, max: number): string {
  if (max <= min) return 'rgb(59,130,246)';
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));

  const from = { r: 59, g: 130, b: 246 };
  const to = { r: 34, g: 197, b: 94 };

  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function toTier(tier?: string): 'S' | 'A' | 'B' | 'C' {
  const normalized = (tier ?? '').toUpperCase();
  if (normalized === 'S' || normalized === 'A' || normalized === 'B' || normalized === 'C') {
    return normalized;
  }
  return 'C';
}

function deriveTraitChips(
  comp: RichCompStatDto,
  traits?: ReturnType<typeof useTraits>['data']
): TraitChip[] {
  const source = comp.comp_label || comp.label || comp.comp_id;
  const rawTokens = source
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const chips: TraitChip[] = [];

  for (let i = 0; i < rawTokens.length; i += 1) {
    const token = rawTokens[i]!;

    if (/^(TFT\d*|Set\d+)$/i.test(token)) continue;

    if (/^\d+$/.test(token) && chips.length > 0) {
      const prev = chips[chips.length - 1]!;
      if (prev.count == null) prev.count = Number(token);
      continue;
    }

    const attachedCount = token.match(/^(.+?)(\d+)$/);
    const traitToken = attachedCount ? attachedCount[1] : token;
    const count = attachedCount ? Number(attachedCount[2]) : null;

    const name = resolveCompName(traitToken, undefined, traits);

    chips.push({
      key: `${traitToken}-${i}`,
      name,
      count,
    });
  }

  if (chips.length === 0) {
    const fallback = resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((name, index) => ({
        key: `${name}-${index}`,
        name,
        count: null,
      }));

    chips.push(...fallback);
  }

  const icons = comp.trait_icons ?? [];
  return chips.slice(0, 3).map((chip, index) => ({ ...chip, icon: icons[index] }));
}

function WinRateTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value;

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-200">{label}</p>
      <p className="mt-1 text-xs text-slate-400">Win Rate</p>
      <p className="text-sm font-semibold tabular-nums text-blue-300">{value?.toFixed(1)}%</p>
    </div>
  );
}

function MetaOverviewPage() {
  const meta = useTierListQuery();
  const comps = useMetaQuery(50);
  const { data: traits } = useTraits();

  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortKey>('winRate');

  const uniqueComps = useMemo<RichCompStatDto[]>(() => {
    if (!comps.data) return [];

    const map = new Map<string, RichCompStatDto>();
    for (const comp of comps.data as RichCompStatDto[]) {
      const existing = map.get(comp.comp_id);
      if (!existing || existing.sample_size < comp.sample_size) {
        map.set(comp.comp_id, comp);
      }
    }

    let rows = Array.from(map.values());

    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter((comp) => {
        const name = resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits);
        return name.toLowerCase().includes(query);
      });
    }

    rows.sort((a, b) => {
      switch (sortOption) {
        case 'winRate':
          return b.win_rate - a.win_rate;
        case 'top4Rate':
          return b.top4_rate - a.top4_rate;
        case 'avgPlacement':
          return a.avg_placement - b.avg_placement;
        case 'games':
          return b.sample_size - a.sample_size;
        default:
          return 0;
      }
    });

    return rows;
  }, [comps.data, search, sortOption, traits]);

  const allComps = useMemo<RichCompStatDto[]>(() => {
    if (!comps.data) return [];
    const map = new Map<string, RichCompStatDto>();

    for (const comp of comps.data as RichCompStatDto[]) {
      const existing = map.get(comp.comp_id);
      if (!existing || existing.sample_size < comp.sample_size) {
        map.set(comp.comp_id, comp);
      }
    }

    return Array.from(map.values());
  }, [comps.data]);

  const sTierCount = meta.data?.tiers.S.length ?? 0;
  const highestWR = allComps.length ? Math.max(...allComps.map((comp) => comp.win_rate)) * 100 : 0;
  const risingCount = allComps.filter((comp) => comp.trend_direction === 'RISING').length;

  const chartData = useMemo(
    () =>
      [...allComps]
        .sort((a, b) => b.win_rate - a.win_rate)
        .slice(0, 10)
        .map((comp) => ({
          name: resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits),
          winRate: Number((comp.win_rate * 100).toFixed(1)),
        })),
    [allComps, traits]
  );

  const [minWinRate, maxWinRate] = useMemo(() => {
    if (chartData.length === 0) return [0, 100] as const;
    const values = chartData.map((d) => d.winRate);
    return [Math.min(...values), Math.max(...values)] as const;
  }, [chartData]);

  const isLoading = comps.isLoading || meta.isLoading;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Meta Overview"
        subtitle="Best compositions across all regions"
        actions={
          meta.data?.patch ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-blue-300 sm:self-auto">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Patch {meta.data.patch}
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Comps"
          value={isLoading ? '-' : allComps.length}
          subtitle="tracked this patch"
          icon={Layers}
          iconColor="text-slate-300"
          iconBg="bg-slate-500/10"
          accentColor="border-l-slate-500"
          loading={comps.isLoading}
        />
        <StatCard
          title="S-Tier Comps"
          value={isLoading ? '-' : sTierCount}
          subtitle="highest tier this patch"
          icon={Star}
          iconColor="text-amber-300"
          iconBg="bg-amber-500/10"
          accentColor="border-l-amber-500"
          loading={meta.isLoading}
        />
        <StatCard
          title="Best Win Rate"
          value={isLoading ? '-' : `${highestWR.toFixed(1)}%`}
          subtitle="top comp this patch"
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          accentColor="border-l-emerald-500"
          loading={comps.isLoading}
        />
        <StatCard
          title="Rising Comps"
          value={isLoading ? '-' : risingCount}
          subtitle="trending upward"
          icon={Flame}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          accentColor="border-l-orange-500"
          loading={comps.isLoading}
        />
      </div>

      <div className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search comp..."
          allowClear
          prefix={<Search size={15} className="text-slate-400" />}
          size="large"
          className="w-full sm:flex-1 [&.ant-input-affix-wrapper]:!rounded-lg [&.ant-input-affix-wrapper]:!border-[var(--border-default)] [&.ant-input-affix-wrapper]:!bg-[var(--bg-surface)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400"
        />

        <Select
          value={sortOption}
          options={SORT_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
          onChange={(value) => setSortOption(value as SortKey)}
          size="large"
          className="w-full sm:w-[220px] [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-[var(--border-default)] [&_.ant-select-selector]:!bg-[var(--bg-surface)] [&_.ant-select-selection-item]:!text-slate-100"
        />

        {!comps.isLoading && (
          <span className="text-xs text-text-secondary sm:ml-auto sm:shrink-0">
            {uniqueComps.length} comps
          </span>
        )}
      </div>

      {comps.error && (
        <ErrorCard message="Failed to load meta data" retry={() => comps.refetch()} />
      )}
      {meta.error && <ErrorCard message="Failed to load tier list" retry={() => meta.refetch()} />}

      <section className="space-y-1.5">
        <h2 className="text-lg font-semibold text-slate-100">Tier List</h2>
        <p className="text-sm text-slate-400">Current composition tiers and their key metrics</p>

        {meta.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(['S', 'A', 'B', 'C'] as const).map((tier) => (
              <div
                key={tier}
                className="animate-pulse overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <div className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)]/40" />
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
                  >
                    <div className="mb-2 h-3 w-3/5 rounded-full bg-[var(--bg-overlay)]/70" />
                    <div className="h-2.5 w-1/2 rounded-full bg-[var(--bg-overlay)]/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : meta.data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(['S', 'A', 'B', 'C'] as const).map((tier) => (
              <TierSection key={tier} tier={tier} comps={meta.data!.tiers[tier]} traits={traits} />
            ))}
          </div>
        ) : null}
      </section>

      <ChartCard
        title="Win Rate Distribution"
        subtitle="Top 10 comps by win rate"
        height={320}
        loading={comps.isLoading}
      >
        {!comps.isLoading && chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="No comps available"
              description="Try adjusting the patch or region filter."
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 16, bottom: 8 }}
            >
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
                dataKey="name"
                width={170}
                tickFormatter={(value: string) => truncateLabel(value, 20)}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<WinRateTooltip />} />
              <Bar dataKey="winRate" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={interpolateBlueToGreen(entry.winRate, minWinRate, maxWinRate)}
                    fillOpacity={0.95}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <section className="space-y-1.5">
        <h2 className="text-lg font-semibold text-slate-100">Top Comps</h2>
        <p className="text-sm text-slate-400">
          Most effective compositions for this patch snapshot
        </p>

        {comps.isLoading ? (
          <CompCardSkeletonGrid />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uniqueComps.map((comp) => (
              <CompCard key={comp.comp_id} comp={comp} traits={traits} />
            ))}

            {uniqueComps.length === 0 && !comps.isLoading && (
              <div className="col-span-full py-8">
                <EmptyState
                  title={search ? 'No matching comps' : 'No compositions found'}
                  description={
                    search
                      ? `No results for "${search}".`
                      : 'No compositions found for current filters.'
                  }
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TierSection({
  tier,
  comps,
  traits,
}: {
  tier: Tier;
  comps: TierCompEntry[];
  traits?: ReturnType<typeof useTraits>['data'];
}) {
  const cardBg = 'bg-[var(--bg-surface)]';
  const tierConfig = getTierConfig(tier);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--border-default)]', cardBg)}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
            tierConfig.bgColor,
            tierConfig.color
          )}
        >
          {tierConfig.label} Tier
        </span>
        <span className="text-xs tabular-nums text-text-secondary">
          {comps.length} comp{comps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {comps.length > 0 ? (
        <div>
          {comps.slice(0, 6).map((comp) => (
            <Link
              key={comp.comp_id}
              to="/meta/$compId"
              params={{ compId: comp.comp_id }}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-white/5"
            >
              <span className="truncate font-medium text-slate-100">
                {resolveCompName(comp.comp_id, comp.label, traits)}
              </span>
              <span
                className={cn('text-xs font-semibold tabular-nums', getWinRateColor(comp.win_rate))}
              >
                {formatWinRate(comp.win_rate)}
              </span>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  getPlacementColor(Math.round(comp.avg_placement))
                )}
              >
                {comp.avg_placement.toFixed(2)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-text-secondary">No comps this patch</div>
      )}
    </div>
  );
}

function CompCard({
  comp,
  traits,
}: {
  comp: RichCompStatDto;
  traits?: ReturnType<typeof useTraits>['data'];
}) {
  const displayName = resolveCompName(comp.comp_id, comp.comp_label || comp.label, traits);
  const traitChips = useMemo(() => deriveTraitChips(comp, traits), [comp, traits]);
  const tier = toTier(comp.tier);
  const top4Rate = comp.top4_rate;

  return (
    <Link
      to="/meta/$compId"
      params={{ compId: comp.comp_id }}
      className="group block rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/70"
    >
      <div className="mb-3 flex items-center gap-2">
        <TierBadge tier={tier} size="sm" />
        <h3 className="truncate font-semibold text-slate-100">{displayName}</h3>
      </div>

      <div className="mb-4 space-y-2">
        {traitChips.map((trait) => (
          <div
            key={trait.key}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5"
          >
            {trait.icon ? (
              <img
                src={trait.icon}
                alt={trait.name}
                className="h-5 w-5 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="h-5 w-5 rounded bg-blue-500/20" />
            )}
            <span className="flex-1 truncate text-xs text-slate-200">{trait.name}</span>
            <span className="text-xs font-semibold tabular-nums text-slate-400">
              {trait.count ?? '-'}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary">WIN %</p>
          <p className={cn('text-sm font-bold tabular-nums', getWinRateColor(comp.win_rate))}>
            {formatWinRate(comp.win_rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary">TOP 4 %</p>
          <p className={cn('text-sm font-bold tabular-nums', getWinRateColor(top4Rate))}>
            {formatWinRate(top4Rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary">AVG</p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              getPlacementColor(Math.round(comp.avg_placement))
            )}
          >
            {comp.avg_placement.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <span className="text-[11px] tabular-nums text-text-secondary">
          {comp.sample_size.toLocaleString()} games
        </span>
      </div>
    </Link>
  );
}
