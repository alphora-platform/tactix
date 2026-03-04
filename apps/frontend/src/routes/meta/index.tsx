import { createFileRoute, Link } from '@tanstack/react-router';
import { useMetaQuery, useTierListQuery } from '@/hooks/useAnalytics';
import { useMemo, useState } from 'react';
import {
  Search,
  ArrowUp,
  ArrowDown,
  BarChart2,
  Trophy,
  TrendingUp,
  Flame,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, defaultChartTheme } from '@/components/ui/ChartCard';
import { TierBadge } from '@/components/ui/TierBadge';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { cn } from '@/lib/utils/cn';
import { ChampionSquare } from '@/components/game/ChampionSquare';
import type { CompStatDto, TierCompEntry } from '@/lib/types/analytics.types';

export const Route = createFileRoute('/meta/')({
  component: MetaOverviewPage,
});

// ── Extended runtime type (API returns extra fields) ──────────────────────────
type RichCompStatDto = CompStatDto & {
  comp_label?: string;
  trait_icons?: string[];
  core_units?: string[];
};

type SortOption = 'Win Rate' | 'Top 4' | 'Avg Placement' | 'Play Count';

const SORT_OPTIONS: SortOption[] = ['Win Rate', 'Top 4', 'Avg Placement', 'Play Count'];

// ── Page ──────────────────────────────────────────────────────────────────────

function MetaOverviewPage() {
  const meta = useTierListQuery();
  const comps = useMetaQuery(50);

  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('Win Rate');

  // Dedup by comp_id, keeping highest sample_size
  const uniqueComps = useMemo<RichCompStatDto[]>(() => {
    if (!comps.data) return [];
    const map = new Map<string, RichCompStatDto>();
    for (const c of comps.data as RichCompStatDto[]) {
      const existing = map.get(c.comp_id);
      if (!existing || existing.sample_size < c.sample_size) map.set(c.comp_id, c);
    }
    let arr = Array.from(map.values());

    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (c) => c.comp_label?.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
      );
    }

    // Sort
    arr.sort((a, b) => {
      switch (sortOption) {
        case 'Win Rate':
          return b.win_rate - a.win_rate;
        case 'Top 4':
          return b.top4_rate - a.top4_rate;
        case 'Avg Placement':
          return a.avg_placement - b.avg_placement;
        case 'Play Count':
          return b.sample_size - a.sample_size;
        default:
          return 0;
      }
    });

    return arr;
  }, [comps.data, search, sortOption]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const allComps = useMemo<RichCompStatDto[]>(() => {
    if (!comps.data) return [];
    const map = new Map<string, RichCompStatDto>();
    for (const c of comps.data as RichCompStatDto[]) {
      const ex = map.get(c.comp_id);
      if (!ex || ex.sample_size < c.sample_size) map.set(c.comp_id, c);
    }
    return Array.from(map.values());
  }, [comps.data]);

  const sTierCount = meta.data?.tiers.S.length ?? 0;
  const highestWR = allComps.length ? Math.max(...allComps.map((c) => c.win_rate)) * 100 : 0;
  const risingCount = allComps.filter((c) => c.trend_direction === 'RISING').length;

  // ── Win Rate Bar Chart data (top 10) ───────────────────────────────────────
  const chartData = useMemo(
    () =>
      [...allComps]
        .sort((a, b) => b.win_rate - a.win_rate)
        .slice(0, 10)
        .map((c) => ({
          name: (c.comp_label || c.label).slice(0, 18),
          winRate: parseFloat((c.win_rate * 100).toFixed(1)),
          tier: c.tier,
        })),
    [allComps]
  );

  const tierBarColor: Record<string, string> = {
    S: '#c89b3c',
    A: '#4fc3f7',
    B: '#66bb6a',
    C: '#9e9e9e',
  };

  const isLoading = comps.isLoading || meta.isLoading;

  return (
    <div className="space-y-6 animate-fade-in pb-20 sm:pb-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Meta Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">Best compositions across all regions</p>
        </div>
        {meta.data?.patch && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
            Patch {meta.data.patch}
          </span>
        )}
      </div>

      {/* ── 2. Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Comps"
          value={isLoading ? '—' : allComps.length}
          subtitle="tracked this patch"
          icon={BarChart2}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue/10"
          accentColor="border-l-accent-blue"
          loading={comps.isLoading}
        />
        <StatCard
          title="S-Tier Comps"
          value={isLoading ? '—' : sTierCount}
          subtitle="highest tier this patch"
          icon={Trophy}
          iconColor="text-accent-gold"
          iconBg="bg-accent-gold/10"
          accentColor="border-l-accent-gold"
          loading={meta.isLoading}
        />
        <StatCard
          title="Best Win Rate"
          value={isLoading ? '—' : `${highestWR.toFixed(1)}%`}
          subtitle="top comp this patch"
          icon={TrendingUp}
          iconColor="text-accent-green"
          iconBg="bg-accent-green/10"
          accentColor="border-l-accent-green"
          loading={comps.isLoading}
        />
        <StatCard
          title="Rising Comps"
          value={isLoading ? '—' : risingCount}
          subtitle="trending upward"
          icon={Flame}
          iconColor="text-orange-400"
          iconBg="bg-orange-400/10"
          accentColor="border-l-orange-500"
          loading={comps.isLoading}
        />
      </div>

      {/* ── 3. Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search comp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-gold transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="appearance-none bg-bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-gold transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                Sort: {o}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
        </div>

        {/* Result count */}
        {!comps.isLoading && (
          <span className="text-xs text-text-secondary ml-auto shrink-0">
            {uniqueComps.length} comps
          </span>
        )}
      </div>

      {/* ── Error states ────────────────────────────────────────────────────── */}
      {comps.error && (
        <ErrorCard message="Failed to load meta data" retry={() => comps.refetch()} />
      )}
      {meta.error && <ErrorCard message="Failed to load tier list" retry={() => meta.refetch()} />}

      {/* ── 4. Tier List ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Tier List
        </h2>
        {meta.isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {(['S', 'A', 'B', 'C'] as const).map((t) => (
              <div key={t} className="rounded-xl border border-border bg-bg-card overflow-hidden">
                <div className="skeleton h-10 w-full" />
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 border-t border-border/30 flex items-center gap-3"
                  >
                    <div className="skeleton h-3 w-3 rounded-full" />
                    <div className="skeleton h-3 flex-1 rounded-full" />
                    <div className="skeleton h-3 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : meta.data ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 items-start">
            {(['S', 'A', 'B', 'C'] as const).map((tier) => (
              <TierSection key={tier} tier={tier} comps={meta.data!.tiers[tier]} />
            ))}
          </div>
        ) : null}
      </section>

      {/* ── 5. Win Rate Distribution Chart ─────────────────────────────────── */}
      <ChartCard
        title="Win Rate Distribution"
        subtitle="Top 10 comps by win rate"
        height={300}
        loading={comps.isLoading}
        empty={!comps.isLoading && chartData.length === 0}
        emptyText="No comps available. Try adjusting the patch or region filter"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid {...defaultChartTheme.cartesianGrid} horizontal={false} vertical />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              {...defaultChartTheme.xAxis}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: '#9e9e9e', fontSize: 11 }}
              axisLine={{ stroke: '#2a3040' }}
              tickLine={false}
            />
            <Tooltip
              {...defaultChartTheme.tooltip}
              formatter={(v: number | undefined) => [`${v != null ? v : '—'}%`, 'Win Rate']}
            />
            <Bar dataKey="winRate" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={tierBarColor[entry.tier ?? ''] ?? '#4fc3f7'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 6. Top Comps Grid ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Top Comps
        </h2>

        {comps.isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-6 h-6 rounded" />
                  <div className="skeleton h-4 flex-1 rounded-full" />
                </div>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="skeleton w-8 h-8 rounded-md" />
                  ))}
                </div>
                <div className="skeleton h-px w-full" />
                <div className="flex gap-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="skeleton h-4 w-12 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {uniqueComps.map((comp) => (
              <CompCard key={comp.comp_id} comp={comp} />
            ))}
            {uniqueComps.length === 0 && !comps.isLoading && (
              <div className="col-span-full py-14 text-center">
                <BarChart2
                  size={40}
                  className="mx-auto mb-3 text-text-secondary opacity-20"
                  strokeWidth={1.5}
                />
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {search ? `No results for "${search}"` : 'No compositions found'}
                </p>
                <p className="text-xs text-text-secondary">
                  {search
                    ? 'Try a different search term'
                    : 'Try adjusting the patch or region filter'}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── TierSection ───────────────────────────────────────────────────────────────

const TIER_STYLES = {
  S: {
    header: 'bg-accent-gold/10 border-b border-accent-gold/30 text-accent-gold',
    dot: 'bg-accent-gold',
  },
  A: {
    header: 'bg-accent-blue/10 border-b border-accent-blue/30 text-accent-blue',
    dot: 'bg-accent-blue',
  },
  B: {
    header: 'bg-accent-green/10 border-b border-accent-green/30 text-accent-green',
    dot: 'bg-accent-green',
  },
  C: {
    header: 'bg-bg-elevated border-b border-border text-text-secondary',
    dot: 'bg-text-secondary',
  },
};

function TierSection({ tier, comps }: { tier: 'S' | 'A' | 'B' | 'C'; comps: TierCompEntry[] }) {
  const styles = TIER_STYLES[tier];

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2.5', styles.header)}>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg leading-none">{tier}</span>
          <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">Tier</span>
        </div>
        <span className="text-xs font-medium opacity-70">
          {comps.length} comp{comps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comp list */}
      {comps.length > 0 ? (
        <ul className="divide-y divide-border/30">
          {comps.slice(0, 6).map((comp) => (
            <li key={comp.comp_id}>
              <Link
                to="/meta/$compId"
                params={{ compId: comp.comp_id }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-elevated transition-colors group gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TierBadge tier={comp.tier} size="sm" />
                  <span className="text-sm font-medium text-text-primary truncate group-hover:text-accent-gold transition-colors">
                    {comp.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-text-secondary tabular-nums">
                    {(comp.win_rate * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-secondary/60 bg-black/20 px-1.5 py-0.5 rounded font-mono tabular-nums">
                    {comp.avg_placement.toFixed(2)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center text-sm text-text-secondary opacity-60">
          No comps this patch
        </div>
      )}
    </div>
  );
}

// ── CompCard ──────────────────────────────────────────────────────────────────

function CompCard({ comp }: { comp: RichCompStatDto }) {
  const winRate = comp.win_rate * 100;
  const top4Rate = comp.top4_rate * 100;
  const units = comp.core_units ?? [];
  const displayUnits = units.slice(0, 6);
  const excess = Math.max(0, units.length - 6);

  const winColor =
    winRate >= 55 ? 'text-accent-green' : winRate < 45 ? 'text-accent-red' : 'text-yellow-400';

  // Fallback display: trait icons when no core_units
  const hasUnits = units.length > 0;
  const traitIcons = comp.trait_icons ?? [];

  return (
    <Link
      to="/meta/$compId"
      params={{ compId: comp.comp_id }}
      className="block rounded-xl border border-border bg-bg-card p-4 hover:border-accent-gold/40 hover:bg-bg-elevated hover:-translate-y-0.5 transition-all duration-200 group relative shadow-card"
    >
      {/* Top row: icon(s) + label + trend */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {traitIcons.length > 0 ? (
            <div className="flex -space-x-1 shrink-0">
              {traitIcons.slice(0, 2).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-6 h-6 rounded bg-black/50 border border-border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          ) : comp.tier ? (
            <TierBadge tier={comp.tier} size="md" />
          ) : null}
          <span className="font-bold text-text-primary truncate group-hover:text-accent-gold transition-colors text-base">
            {comp.comp_label || comp.label}
          </span>
        </div>

        {comp.trend_direction && comp.trend_direction !== 'STABLE' && (
          <span
            className={cn(
              'shrink-0 mt-0.5',
              comp.trend_direction === 'RISING' ? 'text-accent-green' : 'text-accent-red'
            )}
          >
            {comp.trend_direction === 'RISING' ? (
              <ArrowUp size={15} strokeWidth={3} />
            ) : (
              <ArrowDown size={15} strokeWidth={3} />
            )}
          </span>
        )}
      </div>

      {/* Champion row or trait icon fallback */}
      {hasUnits ? (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {displayUnits.map((id, i) => (
            <ChampionSquare
              key={i}
              apiName={id}
              size="sm"
              showCost
              className="w-8 h-8 rounded-md shrink-0"
            />
          ))}
          {excess > 0 && (
            <div className="w-8 h-8 rounded-md bg-black/40 border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">
              +{excess}
            </div>
          )}
        </div>
      ) : traitIcons.length > 0 ? (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {traitIcons.slice(0, 6).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-8 h-8 rounded-md bg-black/40 border border-border object-contain p-1"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ))}
        </div>
      ) : (
        <div className="h-8 mb-4 flex items-center">
          <span className="text-xs text-text-secondary italic opacity-60">
            Unit info unavailable
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex items-center divide-x divide-border/40">
          <div className="pr-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Win
            </div>
            <div className={cn('text-sm font-bold tabular-nums', winColor)}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div className="px-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Top 4
            </div>
            <div className="text-sm font-bold tabular-nums text-text-primary">
              {top4Rate.toFixed(1)}%
            </div>
          </div>
          <div className="pl-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Avg
            </div>
            <div className="text-sm font-bold tabular-nums text-text-primary">
              {comp.avg_placement.toFixed(2)}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-text-secondary bg-black/20 px-2 py-1 rounded font-medium tabular-nums">
          {comp.sample_size.toLocaleString()}g
        </span>
      </div>
    </Link>
  );
}
