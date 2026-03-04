import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  Target,
  Award,
  Trophy,
  Gamepad2,
  Activity,
  BookOpen,
  ExternalLink,
  LogOut,
  Zap,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  usePlacementsQuery,
  useWeeklyReportQuery,
  useTiltReportQuery,
  useProficiencyQuery,
  useRecentGamesQuery,
} from '@/hooks/useTracker';

import { useSettingsStore } from '@/lib/store/settings.store';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, defaultChartTheme } from '@/components/ui/ChartCard';
import { DataTableCard } from '@/components/ui/DataTableCard';
import type { Column } from '@/components/ui/DataTableCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils/cn';
import type { CompProficiencyEntry, RecentGameDto } from '@/lib/types/tracker.types';

// DataTable row types (index signature for DataTableCard generic)
type ProfRow = CompProficiencyEntry & { [k: string]: unknown };
type RecentRow = RecentGameDto & { [k: string]: unknown };

export const Route = createFileRoute('/stats/')({
  component: MyStatsPage,
});

// ── Severity badge ────────────────────────────────────────────────────────────
const SEVERITY_STYLES = {
  HIGH: 'text-accent-red   bg-accent-red/10   border-accent-red/30',
  MEDIUM: 'text-accent-gold  bg-accent-gold/10  border-accent-gold/30',
  LOW: 'text-text-secondary bg-bg-elevated    border-border',
} as const;

// ── Page ──────────────────────────────────────────────────────────────────────
function MyStatsPage() {
  const { puuid, setPuuid } = useSettingsStore();
  const [input, setInput] = useState('');

  if (!puuid) {
    return (
      <PuuidPrompt input={input} setInput={setInput} onSubmit={() => setPuuid(input.trim())} />
    );
  }

  return <StatsDashboard />;
}

// ── PUUID Prompt ──────────────────────────────────────────────────────────────
function PuuidPrompt({
  input,
  setInput,
  onSubmit,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center shadow-glow">
              <User size={36} className="text-accent-gold" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center">
              <Activity size={14} className="text-accent-blue" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Track Your Performance</h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
            Enter your Riot PUUID to unlock personal stats, tilt detection, placement history, and
            weekly improvement reports.
          </p>
        </div>

        {/* How to find PUUID hint */}
        <div className="bg-bg-card border border-border rounded-xl p-4 mb-5 text-sm">
          <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            How to find your PUUID
          </p>
          <ol className="space-y-1.5 text-xs text-text-secondary list-decimal list-inside">
            <li>
              Go to{' '}
              <a
                href="https://account.riotgames.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline inline-flex items-center gap-0.5"
              >
                account.riotgames.com
                <ExternalLink size={10} />
              </a>
            </li>
            <li>Open browser DevTools → Network tab</li>
            <li>
              Reload page, find the <code className="bg-bg-elevated px-1 rounded">userinfo</code>{' '}
              request
            </li>
            <li>
              Copy the <code className="bg-bg-elevated px-1 rounded">sub</code> field from the
              response
            </li>
          </ol>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input.trim() && onSubmit()}
              placeholder="Paste your PUUID here..."
              className="w-full rounded-xl border border-border bg-bg-card pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent-gold/60 focus:outline-none transition-colors font-mono"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={!input.trim()}
            className="w-full rounded-xl bg-accent-gold py-3 text-sm font-bold text-bg-primary hover:bg-accent-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-glow"
          >
            Load My Stats
          </button>
        </div>

        <p className="text-center text-xs text-text-secondary mt-4 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={12} className="text-accent-green" />
          Your PUUID is saved locally — never sent to any third-party
        </p>
      </div>
    </div>
  );
}

// ── Stats Dashboard ───────────────────────────────────────────────────────────
function StatsDashboard() {
  const { clearPuuid } = useSettingsStore();
  const placements = usePlacementsQuery();
  const weekly = useWeeklyReportQuery();
  const tilt = useTiltReportQuery();
  const prof = useProficiencyQuery();
  const recentGames = useRecentGamesQuery(10);

  // Placement chart data
  const placementData = useMemo(
    () =>
      placements.data?.distribution.map((d) => ({
        name: `#${d.placement}`,
        count: d.count,
        pct: d.pct,
        placement: d.placement,
      })) ?? [],
    [placements.data]
  );

  // ── Proficiency table columns ────────────────────────────────────────────
  const profColumns = useMemo<Column<ProfRow>[]>(
    () => [
      {
        key: 'label',
        title: 'Comp',
        render: (_: unknown, rec: ProfRow) => (
          <span className="font-semibold text-text-primary truncate">{rec.label}</span>
        ),
      },
      {
        key: 'games_played',
        title: 'Games',
        width: 70,
        align: 'right',
        sortable: true,
        render: (_: unknown, rec: ProfRow) => (
          <span className="text-text-secondary tabular-nums">{rec.games_played}</span>
        ),
      },
      {
        key: 'avg_placement',
        title: 'Avg Place',
        width: 90,
        align: 'right',
        sortable: true,
        render: (_: unknown, rec: ProfRow) => (
          <span className="font-mono tabular-nums text-text-primary">
            {rec.avg_placement.toFixed(2)}
          </span>
        ),
      },
      {
        key: 'skill_delta',
        title: 'vs Meta',
        width: 90,
        align: 'right',
        sortable: true,
        render: (_: unknown, rec: ProfRow) => {
          const better = rec.skill_delta < 0;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold tabular-nums',
                better ? 'text-accent-green' : 'text-accent-red'
              )}
            >
              {better ? (
                <ArrowDown size={11} strokeWidth={3} />
              ) : (
                <ArrowUp size={11} strokeWidth={3} />
              )}
              {better ? '' : '+'}
              {rec.skill_delta.toFixed(2)}
            </span>
          );
        },
      },
    ],
    []
  );

  // ── Recent games table columns ────────────────────────────────────────────
  const recentColumns = useMemo<Column<RecentRow>[]>(
    () => [
      {
        key: 'game_datetime',
        title: 'Date',
        width: 90,
        render: (_: unknown, rec: RecentRow) => (
          <span className="text-text-secondary text-xs tabular-nums whitespace-nowrap">
            {new Date(String(rec.game_datetime)).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        key: 'game_length_minutes',
        title: 'Duration',
        width: 80,
        render: (_: unknown, rec: RecentRow) => (
          <span className="text-text-secondary text-xs tabular-nums">
            {Math.round(Number(rec.game_length_minutes))}m
          </span>
        ),
      },
      {
        key: 'comp_label',
        title: 'Comp',
        render: (_: unknown, rec: RecentRow) => (
          <span className="font-medium text-text-primary truncate">
            {(rec.comp_label as string) || 'Unknown'}
          </span>
        ),
      },
      {
        key: 'placement',
        title: 'Place',
        width: 70,
        align: 'right' as const,
        sortable: true,
        render: (_: unknown, rec: RecentRow) => {
          const p = Number(rec.placement);
          return (
            <span
              className={cn(
                'font-bold tabular-nums',
                p === 1 ? 'text-accent-gold' : p <= 4 ? 'text-accent-green' : 'text-text-secondary'
              )}
            >
              #{p}
            </span>
          );
        },
      },
    ],
    []
  );

  const isLoading = placements.isLoading;

  return (
    <div className="space-y-5 pb-24 sm:pb-10 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">My Stats</h1>
          <p className="text-xs text-text-secondary mt-0.5">Personal performance tracker</p>
        </div>
        <button
          onClick={clearPuuid}
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-red border border-border hover:border-accent-red/40 rounded-lg px-3 py-1.5 transition-all duration-150"
        >
          <LogOut size={13} />
          Switch Account
        </button>
      </div>

      {/* ── 1. Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Placement"
          value={
            placements.data?.avg_placement != null ? placements.data.avg_placement.toFixed(2) : '—'
          }
          subtitle="lower is better"
          icon={Target}
          iconColor="text-accent-gold"
          iconBg="bg-accent-gold/10"
          accentColor="border-l-accent-gold"
          loading={isLoading}
        />
        <StatCard
          title="Top 4 Rate"
          value={
            placements.data?.top4_rate != null
              ? `${(placements.data.top4_rate * 100).toFixed(1)}%`
              : '—'
          }
          subtitle="podium finishes"
          icon={Award}
          iconColor="text-accent-green"
          iconBg="bg-accent-green/10"
          accentColor="border-l-accent-green"
          loading={isLoading}
        />
        <StatCard
          title="Win Rate"
          value={
            placements.data?.win_rate != null
              ? `${(placements.data.win_rate * 100).toFixed(1)}%`
              : '—'
          }
          subtitle="1st place finishes"
          icon={Trophy}
          iconColor="text-accent-blue"
          iconBg="bg-accent-blue/10"
          accentColor="border-l-accent-blue"
          loading={isLoading}
        />
        <StatCard
          title="Total Games"
          value={placements.data?.total_games?.toLocaleString() ?? '—'}
          subtitle="games analyzed"
          icon={Gamepad2}
          iconColor="text-text-secondary"
          iconBg="bg-bg-elevated"
          accentColor="border-l-border"
          loading={isLoading}
        />
      </div>

      {/* ── Errors ──────────────────────────────────────────────────────────── */}
      {placements.error && (
        <ErrorCard message="Failed to load placement data" retry={() => placements.refetch()} />
      )}

      {/* ── Zero-games empty state ──────────────────────────────────────────── */}
      {!placements.isLoading && placements.data?.total_games === 0 && (
        <div className="rounded-xl border border-border bg-bg-card shadow-card p-10 text-center">
          <Gamepad2
            size={48}
            className="mx-auto mb-4 text-text-secondary opacity-20"
            strokeWidth={1.5}
          />
          <p className="text-base font-bold text-text-primary mb-2">No games recorded yet</p>
          <p className="text-sm text-text-secondary max-w-xs mx-auto">
            Play some TFT games and come back — your stats will appear here once data has been
            collected.
          </p>
        </div>
      )}

      {/* ── 2. Tilt Status ──────────────────────────────────────────────────── */}
      {tilt.isLoading && (
        <div className="rounded-xl border border-border bg-bg-card shadow-card p-5">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-32 rounded-full" />
              <div className="skeleton h-3 w-48 rounded-full" />
            </div>
            <div className="skeleton h-2 w-36 rounded-full shrink-0" />
          </div>
        </div>
      )}
      {tilt.error && (
        <ErrorCard message="Failed to load tilt status" retry={() => tilt.refetch()} />
      )}
      {tilt.data && (
        <div
          className={cn(
            'rounded-xl border p-5 shadow-card transition-colors',
            tilt.data.is_tilted
              ? 'border-accent-red/40 bg-accent-red/5'
              : 'border-accent-green/30 bg-accent-green/5'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon + title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                  tilt.data.is_tilted
                    ? 'bg-accent-red/15 border border-accent-red/30'
                    : 'bg-accent-green/15 border border-accent-green/30'
                )}
              >
                {tilt.data.is_tilted ? (
                  <AlertTriangle size={20} className="text-accent-red" />
                ) : (
                  <CheckCircle2 size={20} className="text-accent-green" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-text-primary">
                  {tilt.data.is_tilted ? 'Tilt Detected' : 'Playing Well'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  {tilt.data.recommendation}
                </p>
                {tilt.data.streak_type !== 'NONE' && (
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <Zap
                      size={11}
                      className={
                        tilt.data.streak_type === 'WIN' ? 'text-accent-green' : 'text-accent-red'
                      }
                    />
                    {tilt.data.streak_length}-game {tilt.data.streak_type.toLowerCase()} streak
                  </p>
                )}
              </div>
            </div>

            {/* Tilt score */}
            <div className="shrink-0 w-full sm:w-36">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-secondary">Tilt Score</span>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    tilt.data.is_tilted ? 'text-accent-red' : 'text-accent-green'
                  )}
                >
                  {tilt.data.tilt_score}/100
                </span>
              </div>
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden border border-border/50">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    tilt.data.is_tilted ? 'bg-accent-red' : 'bg-accent-green'
                  )}
                  style={{ width: `${tilt.data.tilt_score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Placement Distribution Chart ─────────────────────────────────── */}
      <ChartCard
        title="Placement Distribution"
        subtitle="How often you finish in each placement"
        height={180}
        loading={placements.isLoading}
        empty={!placements.isLoading && placementData.length === 0}
        emptyText="No placement data yet"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={placementData}
            barSize={32}
            margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
          >
            <XAxis dataKey="name" {...defaultChartTheme.xAxis} axisLine={false} />
            <YAxis {...defaultChartTheme.yAxis} axisLine={false} width={28} />
            <Tooltip
              {...defaultChartTheme.tooltip}
              formatter={(v: number | undefined) => [`${v ?? 0} games`, 'Count']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {placementData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.placement === 1
                      ? '#c89b3c' // accent-gold for 1st
                      : d.placement <= 4
                      ? '#66bb6a' // accent-green for top 4
                      : '#2a3040' // border color for 5-8
                  }
                  fillOpacity={d.placement <= 4 ? 0.9 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 4. Comp Proficiency Table ────────────────────────────────────────── */}
      {prof.error && (
        <ErrorCard message="Failed to load proficiency data" retry={() => prof.refetch()} />
      )}
      <DataTableCard
        title="Comp Proficiency"
        subtitle="Your performance vs. the global meta"
        columns={profColumns as unknown as Column<Record<string, unknown>>[]}
        data={(prof.data?.comps ?? []) as unknown as Record<string, unknown>[]}
        rowKey="comp_id"
        loading={prof.isLoading}
        emptyText="Play more games across different comps to build your proficiency profile"
        searchable
        searchPlaceholder="Search comp..."
        actions={
          <span className="text-xs text-text-secondary flex items-center gap-1">
            <BookOpen size={12} />↓ better than meta
          </span>
        }
      />

      {/* ── 5. Weekly Weaknesses ─────────────────────────────────────────────── */}
      {weekly.data && weekly.data.weaknesses.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">
              Weekly Report — Areas to Improve
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Based on your last {weekly.data.total_games} games this patch
            </p>
          </div>
          <ul className="divide-y divide-border/30">
            {weekly.data.weaknesses.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-bg-elevated/40 transition-colors"
              >
                <span
                  className={cn(
                    'mt-0.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap',
                    SEVERITY_STYLES[w.severity]
                  )}
                >
                  {w.severity}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-text-primary">{w.area}</span>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                    {w.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {weekly.data.improvement_tips.length > 0 && (
            <div className="px-5 py-4 border-t border-border/50 bg-bg-elevated/30">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Tips
              </p>
              <ul className="space-y-1">
                {weekly.data.improvement_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                    <span className="text-accent-gold mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Recent Games Table ────────────────────────────────────────────── */}
      {recentGames.error && (
        <ErrorCard message="Failed to load recent games" retry={() => recentGames.refetch()} />
      )}
      <DataTableCard
        title="Recent Games"
        subtitle={
          recentGames.data?.length
            ? `Last ${recentGames.data.length} games played`
            : 'Your latest matches'
        }
        columns={recentColumns as unknown as Column<Record<string, unknown>>[]}
        data={(recentGames.data ?? []) as unknown as Record<string, unknown>[]}
        rowKey="match_id"
        loading={recentGames.isLoading}
        emptyText="No recent games found — play some TFT to populate this table"
      />
    </div>
  );
}
