import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trophy,
  Target,
  Database,
  ChevronDown,
  Star,
} from 'lucide-react';
import { useCompDetailQuery, useCompTrendQuery, useMetaQuery } from '@/hooks/useAnalytics';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, defaultChartTheme } from '@/components/ui/ChartCard';
import { TierBadge } from '@/components/ui/TierBadge';
import { ChampionSquare } from '@/components/game/ChampionSquare';
import { ItemIcon } from '@/components/game/ItemIcon';
import { AugmentIcon } from '@/components/game/AugmentIcon';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
import { getChampionName, getAugmentName } from '@/lib/utils/gameAssets';
import { resolveCompName } from '@/lib/utils/compName';
import { useChampions, useAugments, useTraits } from '@/lib/hooks/useMetadata';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { AugmentDto, UnitPriorityDto, BestItemsDto } from '@/lib/types/analytics.types';

export const Route = createFileRoute('/meta/$compId')({
  component: CompDetailPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_STYLES = {
  core: 'text-accent-gold  bg-accent-gold/10  border border-accent-gold/30',
  flex: 'text-accent-blue  bg-accent-blue/10  border border-accent-blue/30',
  optional: 'text-text-secondary bg-bg-elevated   border border-border',
} as const;

const ROLE_CONFIG = {
  core: {
    label: 'CORE',
    color: 'text-accent-gold',
    border: 'border-accent-gold/30',
    bg: 'bg-accent-gold/5',
  },
  flex: {
    label: 'FLEX',
    color: 'text-accent-blue',
    border: 'border-accent-blue/30',
    bg: 'bg-accent-blue/5',
  },
  optional: {
    label: 'OPTIONAL',
    color: 'text-text-secondary',
    border: 'border-border',
    bg: 'bg-bg-elevated/30',
  },
} as const;

// cleanAugmentName removed — replaced by getAugmentName() + augment metadata

// ── Star row ──────────────────────────────────────────────────────────────────
function AvgTierStars({ avgTier }: { avgTier: number }) {
  const filled = Math.round(avgTier);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={10}
          className={n <= filled ? 'text-accent-gold fill-accent-gold' : 'text-border'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CompDetailPage() {
  const { compId } = Route.useParams();
  const detail = useCompDetailQuery(compId);
  const trend = useCompTrendQuery(compId);
  const meta = useMetaQuery(30);
  const { data: champions } = useChampions();
  const { data: augments } = useAugments();
  const { data: traits } = useTraits();

  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Find stat from global meta list (comp_label + trait_icons now in CompStatDto)
  const stat = meta.data?.find((c) => c.comp_id === compId);

  // Trend chart data
  const trendChartData =
    trend.data?.windows
      .map((w) => ({ window: w.time_window, win_rate: +(w.win_rate * 100).toFixed(1) }))
      .reverse() ?? [];

  // Level distribution bar data
  const levelDist = detail.data?.level_timing?.top_players_level_dist;
  const levelBarData = levelDist
    ? [
        { level: 'L6', value: Math.round(levelDist.l6 * 100) },
        { level: 'L7', value: Math.round(levelDist.l7 * 100) },
        { level: 'L8', value: Math.round(levelDist.l8 * 100) },
        { level: 'L9', value: Math.round(levelDist.l9 * 100) },
      ]
    : [];

  const rawLabel = detail.data?.comp_label || trend.data?.label || stat?.comp_label;
  const compName = resolveCompName(compId, rawLabel, traits);
  const traitIcons = detail.data?.trait_icons ?? stat?.trait_icons ?? [];

  const isInitialLoad = meta.isLoading && !stat;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12 animate-fade-in">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/meta"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-gold transition-colors mb-4"
        >
          <ArrowLeft size={15} />
          Back to Meta
        </Link>

        {/* Hero card */}
        <div className="rounded-2xl border border-border bg-bg-card overflow-hidden relative shadow-card">
          {/* Accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-blue via-accent-gold to-accent-red" />

          {isInitialLoad ? (
            /* ── Hero skeleton ─────────────────────────────── */
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton w-8 h-8 rounded-md" />
                ))}
                <div className="skeleton h-8 w-48 rounded-lg" />
                <div className="skeleton h-6 w-12 rounded-full" />
              </div>
              <div className="skeleton h-4 w-24 rounded-full" />
            </div>
          ) : (
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Left: name + icons + stats */}
              <div className="min-w-0">
                {/* Trait icons + title */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {traitIcons.length > 0 && (
                    <div className="flex -space-x-1 shrink-0">
                      {traitIcons.slice(0, 4).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="w-8 h-8 rounded-md bg-black/60 border border-border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <h1 className="text-2xl font-black text-text-primary tracking-tight">
                    {compName}
                  </h1>
                  {stat?.tier && <TierBadge tier={stat.tier} size="md" />}
                  {stat?.trend_direction === 'RISING' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-accent-green bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 rounded-full">
                      <ArrowUp size={11} strokeWidth={3} /> RISING
                    </span>
                  )}
                  {stat?.trend_direction === 'FALLING' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-accent-red bg-accent-red/10 border border-accent-red/30 px-2 py-0.5 rounded-full">
                      <ArrowDown size={11} strokeWidth={3} /> FALLING
                    </span>
                  )}
                </div>

                {/* Patch badge */}
                {detail.data?.patch && (
                  <span className="inline-flex items-center text-[11px] text-text-secondary bg-bg-elevated border border-border px-2 py-0.5 rounded-full font-mono">
                    Patch {detail.data.patch}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Win Rate"
          value={stat ? `${(stat.win_rate * 100).toFixed(1)}%` : '—'}
          subtitle="overall win rate"
          icon={Trophy}
          iconColor={
            stat
              ? stat.win_rate * 100 >= 55
                ? 'text-accent-green'
                : 'text-accent-gold'
              : 'text-text-secondary'
          }
          iconBg={stat && stat.win_rate * 100 >= 55 ? 'bg-accent-green/10' : 'bg-accent-gold/10'}
          accentColor={
            stat && stat.win_rate * 100 >= 55 ? 'border-l-accent-green' : 'border-l-accent-gold'
          }
          loading={meta.isLoading}
        />
        <StatCard
          title="Avg Placement"
          value={stat ? stat.avg_placement.toFixed(2) : '—'}
          subtitle="lower is better"
          icon={Target}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue/10"
          accentColor="border-l-accent-blue"
          loading={meta.isLoading}
        />
        <StatCard
          title="Sample Size"
          value={stat ? stat.sample_size.toLocaleString() : '—'}
          subtitle="games analyzed"
          icon={Database}
          iconColor="text-text-secondary"
          iconBg="bg-bg-elevated"
          accentColor="border-l-border"
          loading={meta.isLoading}
        />
      </div>

      {detail.error && (
        <ErrorCard message="Failed to load comp details" retry={() => detail.refetch()} />
      )}

      {/* ── 3. Unit Priority ───────────────────────────────────────────────── */}
      {(detail.data || detail.isLoading) && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Unit Priority
          </h2>

          {detail.isLoading ? (
            /* Skeleton: two mock role groups */
            <div className="space-y-5">
              {[4, 3].map((count, gi) => (
                <div key={gi}>
                  <div className="skeleton h-6 w-20 rounded-full mb-3" />
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {[...Array(count)].map((_, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-bg-card p-2 space-y-1.5"
                      >
                        <div className="skeleton w-12 h-12 rounded-lg mx-auto" />
                        <div className="skeleton h-2.5 w-full rounded-full" />
                        <div className="skeleton h-2 w-8 rounded-full mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {(['core', 'flex', 'optional'] as const).map((role) => {
                const roleUnits = (detail.data?.unit_priority ?? [])
                  .filter((u) => u.role === role)
                  .sort((a, b) => b.priority_score - a.priority_score);

                if (roleUnits.length === 0) return null;

                const cfg = ROLE_CONFIG[role];

                return (
                  <div key={role}>
                    {/* Role section header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={cn(
                          'text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded border',
                          cfg.color,
                          cfg.border,
                          cfg.bg
                        )}
                      >
                        {cfg.label}
                      </span>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>

                    {/* Unit grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {roleUnits.map((unit) => (
                        <UnitCard
                          key={unit.character_id}
                          unit={unit}
                          bestItems={detail.data!.best_items.find(
                            (b) => b.unit === unit.character_id
                          )}
                          champions={champions}
                          roleCfg={cfg}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 4. Best Items + Carry Combos ──────────────────────────────────── */}
      {detail.data && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Carry Items Breakdown
          </h2>
          <div className="space-y-2">
            {detail.data.best_items.map((b) => (
              <ItemsAccordion
                key={b.unit}
                bestItems={b}
                unitPriority={detail.data!.unit_priority.find((u) => u.character_id === b.unit)}
                champions={champions}
                expanded={expandedUnit === b.unit}
                onToggle={() => setExpandedUnit(expandedUnit === b.unit ? null : b.unit)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Augment Path + Trend Chart (side by side on lg) ────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Augment Path */}
        {(detail.data || detail.isLoading) && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Optimal Augments
            </h2>
            <div className="rounded-xl border border-border bg-bg-card shadow-card overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-border/50 overflow-x-auto">
                {[
                  { key: 'stage_2_1' as const, label: 'Stage 2-1', color: 'text-accent-blue' },
                  { key: 'stage_3_2' as const, label: 'Stage 3-2', color: 'text-accent-gold' },
                  { key: 'stage_4_2' as const, label: 'Stage 4-2', color: 'text-accent-red' },
                ].map(({ key, label, color }) => (
                  <AugmentColumn
                    key={key}
                    label={label}
                    labelColor={color}
                    augments={detail.data?.augment_path[key] ?? []}
                    loading={detail.isLoading}
                    augmentsMeta={augments}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Trend Chart */}
        <section>
          <ChartCard
            title="Win Rate Trend"
            subtitle="Win rate across time windows"
            height={260}
            loading={trend.isLoading}
            empty={!trend.isLoading && trendChartData.length === 0}
            emptyText="No trend data available"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="wrAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4fc3f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4fc3f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="window" {...defaultChartTheme.xAxis} tickMargin={6} />
                <YAxis
                  domain={['auto', 'auto']}
                  {...defaultChartTheme.yAxis}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  {...defaultChartTheme.tooltip}
                  formatter={(v: number | undefined) => [`${v ?? '—'}%`, 'Win Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="win_rate"
                  stroke="#4fc3f7"
                  strokeWidth={2.5}
                  fill="url(#wrAreaFill)"
                  dot={{ r: 3, fill: '#161a23', stroke: '#4fc3f7', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#4fc3f7', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      </div>

      {/* ── 6. Level Timing ────────────────────────────────────────────────── */}
      {(detail.data?.level_timing || detail.isLoading) && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Level Timing
          </h2>
          <div className="rounded-xl border border-border bg-bg-card shadow-card overflow-hidden">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 divide-border/50
                             [&>*]:border-b [&>*]:border-border/50
                             sm:[&>*]:border-b-0 sm:[&>*]:border-r sm:[&>*:last-child]:border-r-0"
            >
              <LevelStat
                label="Avg Final Level"
                value={detail.data?.level_timing?.avg_final_level?.toFixed(1) ?? '—'}
                loading={detail.isLoading}
              />
              <LevelStat
                label="Hits Lv8"
                value={
                  detail.data?.level_timing?.typical_level_8_pct != null
                    ? `${(detail.data.level_timing.typical_level_8_pct * 100).toFixed(0)}%`
                    : '—'
                }
                loading={detail.isLoading}
              />
              <LevelStat
                label="Avg Gold Left"
                value={detail.data?.level_timing?.avg_gold_left?.toFixed(1) ?? '—'}
                loading={detail.isLoading}
              />
              {/* Level distribution mini-bar */}
              <div className="p-4">
                <p className="text-xs text-text-secondary font-medium mb-2 uppercase tracking-wide">
                  Level Dist
                </p>
                {detail.isLoading ? (
                  <div className="skeleton h-16 w-full rounded" />
                ) : levelBarData.length > 0 ? (
                  <div style={{ height: 64 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={levelBarData}
                        margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="level"
                          tick={{ fill: '#9e9e9e', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          {...defaultChartTheme.tooltip}
                          formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Players']}
                        />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={24}>
                          {levelBarData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.level === 'L8' || entry.level === 'L9' ? '#c89b3c' : '#4fc3f7'
                              }
                              fillOpacity={0.8}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No data</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ── UnitCard ──────────────────────────────────────────────────────────────────

interface UnitCardProps {
  unit: UnitPriorityDto;
  bestItems?: BestItemsDto;
  champions: ReturnType<typeof useChampions>['data'];
  roleCfg: (typeof ROLE_CONFIG)[keyof typeof ROLE_CONFIG];
}

function UnitCard({ unit, bestItems, champions, roleCfg }: UnitCardProps) {
  const name = getChampionName(unit.character_id, champions);
  const topItems = bestItems?.combos[0]?.items.slice(0, 3) ?? [];
  const appearPct = Math.round(unit.top4_appearance_rate * 100);

  return (
    <div
      className={cn(
        'rounded-lg border bg-bg-card/60 p-2 flex flex-col items-center gap-1.5 text-center',
        'hover:bg-bg-elevated transition-colors',
        roleCfg.border
      )}
    >
      {/* Champion portrait + stars (inline in ChampionSquare) */}
      <ChampionSquare
        apiName={unit.character_id}
        size="lg"
        showCost
        showStars={Math.round(unit.avg_tier)}
      />

      {/* Name */}
      <span className="text-[11px] font-semibold text-text-primary leading-tight truncate w-full">
        {name}
      </span>

      {/* Top-4 appearance rate */}
      <span className={cn('text-[10px] font-mono', roleCfg.color)}>{appearPct}%</span>

      {/* Best item icons */}
      {topItems.length > 0 && (
        <div className="flex gap-0.5 justify-center">
          {topItems.map((item, i) => (
            <ItemIcon key={i} apiName={item} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── LevelStat ─────────────────────────────────────────────────────────────────

function LevelStat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="p-4">
      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      {loading ? (
        <div className="skeleton h-7 w-16 rounded" />
      ) : (
        <p className="text-2xl font-bold tabular-nums text-text-primary">{value}</p>
      )}
    </div>
  );
}

// ── AugmentColumn ─────────────────────────────────────────────────────────────

function AugmentColumn({
  label,
  labelColor,
  augments,
  loading,
  augmentsMeta,
}: {
  label: string;
  labelColor: string;
  augments: AugmentDto[];
  loading: boolean;
  augmentsMeta?: Parameters<typeof getAugmentName>[1];
}) {
  return (
    <div className="p-4">
      <p className={cn('text-xs font-bold uppercase tracking-wider mb-3 text-center', labelColor)}>
        {label}
      </p>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="skeleton w-8 h-8 rounded shrink-0" />
              <div className="skeleton h-3 flex-1 rounded-full" />
            </div>
          ))}
        </div>
      ) : augments.length === 0 ? (
        <p className="text-xs text-text-secondary text-center italic py-4">No data</p>
      ) : (
        <ul className="space-y-2">
          {augments.slice(0, 3).map((aug, i) => (
            <li key={i} className="flex items-center gap-2 bg-bg-elevated/40 rounded-lg p-2">
              <AugmentIcon apiName={aug.augment_name} size="sm" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-semibold text-text-primary truncate"
                  title={aug.augment_name}
                >
                  {getAugmentName(aug.augment_name, augmentsMeta)}
                </p>
                <p className="text-[10px] text-accent-green font-mono tabular-nums">
                  {(aug.win_rate * 100).toFixed(1)}% WR
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── ItemsAccordion ────────────────────────────────────────────────────────────

interface ItemsAccordionProps {
  bestItems: BestItemsDto;
  unitPriority?: UnitPriorityDto;
  champions: ReturnType<typeof useChampions>['data'];
  expanded: boolean;
  onToggle: () => void;
}

function ItemsAccordion({
  bestItems: b,
  unitPriority,
  champions,
  expanded,
  onToggle,
}: ItemsAccordionProps) {
  const role = unitPriority?.role ?? 'optional';
  const name = getChampionName(b.unit, champions);
  const topCombo = b.combos[0];
  if (!topCombo) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Header / summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-3 hover:bg-bg-elevated/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChampionSquare
            apiName={b.unit}
            size="sm"
            showCost
            className="w-10 h-10 rounded shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text-primary text-sm">{name}</span>
              <span
                className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full',
                  ROLE_STYLES[role]
                )}
              >
                {role}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Top WR: {(topCombo.win_rate * 100).toFixed(1)}% · {topCombo.sample_size} games
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {topCombo.items.slice(0, 3).map((item, i) => (
            <ItemIcon key={i} apiName={item} size="md" />
          ))}
          <ChevronDown
            size={16}
            className={cn(
              'text-text-secondary ml-2 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded combos table */}
      {expanded && (
        <div className="border-t border-border/50 px-5 pb-4 pt-3 bg-black/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary text-xs border-b border-border/30">
                <th className="text-left py-2 font-semibold">Items</th>
                <th className="text-right py-2 font-semibold">Win Rate</th>
                <th className="text-right py-2 px-3 font-semibold">Games</th>
                <th className="hidden sm:table-cell py-2 font-semibold w-1/3">
                  <span className="text-text-secondary/50">Relative</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {b.combos.slice(0, 6).map((combo, idx) => {
                const wr = combo.win_rate * 100;
                const maxWR = b.combos[0].win_rate * 100;
                const barW = `${Math.min(100, (wr / (maxWR || 1)) * 100)}%`;
                return (
                  <tr
                    key={idx}
                    className="border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        {combo.items.map((item, k) => (
                          <ItemIcon key={k} apiName={item} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td
                      className={cn(
                        'py-2.5 text-right font-bold tabular-nums',
                        wr >= 50 ? 'text-accent-green' : 'text-yellow-300'
                      )}
                    >
                      {wr.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary font-mono text-xs tabular-nums">
                      {combo.sample_size}
                    </td>
                    <td className="py-2.5 hidden sm:table-cell">
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-blue rounded-full transition-all"
                          style={{ width: barW }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
