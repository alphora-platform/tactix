import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button, Input, Progress, Switch, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  Target,
  Award,
  Trophy,
  BarChart2,
  Gamepad2,
  Activity,
  BookOpen,
  ExternalLink,
  LogOut,
  Zap,
  ArrowUp,
  ArrowDown,
  Search,
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
import { ChartCard } from '@/components/ui/ChartCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils/cn';
import type { CompProficiencyEntry, RecentGameDto } from '@/lib/types/tracker.types';

export const Route = createFileRoute('/stats/')({
  component: MyStatsPage,
});

const SEVERITY_STYLES = {
  HIGH: 'text-accent-red bg-accent-red/10 border-accent-red/30',
  MEDIUM: 'text-accent-gold bg-accent-gold/10 border-accent-gold/30',
  LOW: 'text-text-secondary bg-bg-elevated border-border',
} as const;

const TABLE_CLASS =
  '[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-surface)] [&_.ant-table-thead>tr>th]:!text-slate-300 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent [&_.ant-table-placeholder]:!bg-transparent [&_.ant-pagination-item]:!border-[var(--border-default)] [&_.ant-pagination-item>a]:!text-slate-300 [&_.ant-pagination-item-active]:!border-blue-500 [&_.ant-pagination-item-active>a]:!text-blue-400 [&_.ant-pagination-prev_.ant-pagination-item-link]:!border-[var(--border-default)] [&_.ant-pagination-next_.ant-pagination-item-link]:!border-[var(--border-default)] [&_.ant-pagination-prev_.ant-pagination-item-link]:!text-slate-300 [&_.ant-pagination-next_.ant-pagination-item-link]:!text-slate-300';

function getTiltStrokeColor(score: number): string {
  if (score > 70) return '#22c55e';
  if (score >= 40) return '#facc15';
  return '#ef4444';
}

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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent-gold/30 bg-accent-gold/10 shadow-glow">
              <User size={36} className="text-accent-gold" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-accent-blue/40 bg-accent-blue/20">
              <Activity size={14} className="text-accent-blue" />
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 font-['Rajdhani'] text-2xl font-bold tracking-tight text-slate-50">
            Track Your Performance
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary">
            Enter your Riot PUUID to unlock personal stats, tilt detection, placement history, and
            weekly improvement reports.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            How to find your PUUID
          </p>
          <ol className="list-inside list-decimal space-y-1.5 text-xs text-text-secondary">
            <li>
              Go to{' '}
              <a
                href="https://account.riotgames.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-accent-blue hover:underline"
              >
                account.riotgames.com
                <ExternalLink size={10} />
              </a>
            </li>
            <li>Open browser DevTools - Network tab</li>
            <li>
              Reload page, find the <code className="rounded bg-bg-elevated px-1">userinfo</code>{' '}
              request
            </li>
            <li>
              Copy the <code className="rounded bg-bg-elevated px-1">sub</code> field from the
              response
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input.trim() && onSubmit()}
              placeholder="Paste your PUUID here..."
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-3 pl-10 pr-4 font-mono text-sm text-text-primary placeholder:text-text-secondary transition-colors focus:border-accent-gold/60 focus:outline-none"
            />
          </div>
          <button
            onClick={onSubmit}
            disabled={!input.trim()}
            className="w-full rounded-xl bg-accent-gold py-3 text-sm font-bold text-bg-primary shadow-glow transition-all duration-150 hover:bg-accent-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Load My Stats
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
          <CheckCircle2 size={12} className="text-accent-green" />
          Your PUUID is saved locally - never sent to any third-party
        </p>
      </div>
    </div>
  );
}

function StatsDashboard() {
  const { clearPuuid } = useSettingsStore();
  const placements = usePlacementsQuery();
  const weekly = useWeeklyReportQuery();
  const tilt = useTiltReportQuery();
  const prof = useProficiencyQuery();
  const recentGames = useRecentGamesQuery(10);

  const [compSearch, setCompSearch] = useState('');
  const [betterThanMetaOnly, setBetterThanMetaOnly] = useState(false);

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

  const proficiencyRows = useMemo(() => {
    let rows = prof.data?.comps ?? [];

    if (compSearch.trim()) {
      const query = compSearch.trim().toLowerCase();
      rows = rows.filter((row) => row.label.toLowerCase().includes(query));
    }

    if (betterThanMetaOnly) {
      rows = rows.filter((row) => row.skill_delta < 0);
    }

    return rows;
  }, [prof.data, compSearch, betterThanMetaOnly]);

  const profColumns = useMemo<TableProps<CompProficiencyEntry>['columns']>(
    () => [
      {
        title: 'COMP',
        dataIndex: 'label',
        key: 'label',
        render: (_: unknown, rec: CompProficiencyEntry) => (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
              <BookOpen size={13} />
            </span>
            <span className="truncate font-semibold text-text-primary">{rec.label}</span>
          </div>
        ),
      },
      {
        title: 'GAMES',
        dataIndex: 'games_played',
        key: 'games_played',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.games_played - b.games_played,
        render: (value: number) => (
          <span className="tabular-nums text-text-secondary">{value}</span>
        ),
      },
      {
        title: 'AVG PLACE',
        dataIndex: 'avg_placement',
        key: 'avg_placement',
        width: 130,
        align: 'right',
        sorter: (a, b) => a.avg_placement - b.avg_placement,
        render: (value: number) => (
          <span className="font-mono tabular-nums text-text-primary">{value.toFixed(2)}</span>
        ),
      },
      {
        title: 'VS META',
        dataIndex: 'skill_delta',
        key: 'skill_delta',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.skill_delta - b.skill_delta,
        render: (value: number) => {
          const better = value < 0;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold tabular-nums',
                better ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {better ? (
                <ArrowDown size={11} strokeWidth={3} />
              ) : (
                <ArrowUp size={11} strokeWidth={3} />
              )}
              {better ? '' : '+'}
              {value.toFixed(2)}
            </span>
          );
        },
      },
    ],
    []
  );

  const recentColumns = useMemo<TableProps<RecentGameDto>['columns']>(
    () => [
      {
        title: 'DATE',
        dataIndex: 'game_datetime',
        key: 'game_datetime',
        width: 130,
        render: (value: string) => (
          <span className="whitespace-nowrap text-xs tabular-nums text-text-secondary">
            {new Date(value).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        title: 'DURATION',
        dataIndex: 'game_length_minutes',
        key: 'game_length_minutes',
        width: 110,
        render: (value: number) => (
          <span className="text-xs tabular-nums text-text-secondary">{Math.round(value)}m</span>
        ),
      },
      {
        title: 'COMP',
        dataIndex: 'comp_label',
        key: 'comp_label',
        render: (value: string) => (
          <span className="truncate font-medium text-text-primary">{value || 'Unknown'}</span>
        ),
      },
      {
        title: 'PLACE',
        dataIndex: 'placement',
        key: 'placement',
        width: 100,
        align: 'right',
        sorter: (a, b) => a.placement - b.placement,
        render: (placement: number) => (
          <span
            className={cn(
              'font-bold tabular-nums',
              placement === 1
                ? 'text-amber-400'
                : placement <= 4
                ? 'text-emerald-400'
                : 'text-rose-400'
            )}
          >
            #{placement}
          </span>
        ),
      },
    ],
    []
  );

  const isLoading = placements.isLoading;
  const recentRows = recentGames.data ?? [];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="My Stats"
        subtitle="Personal performance tracker"
        actions={
          <Button
            onClick={clearPuuid}
            ghost
            icon={<LogOut size={14} />}
            className="!border-[var(--border-default)] !text-slate-300 hover:!border-blue-500/60 hover:!bg-white/5 hover:!text-slate-100"
          >
            Switch Account
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} rows={3} showHeader />
          ))
        ) : (
          <>
            <StatCard
              title="Avg Placement"
              value={
                placements.data?.avg_placement != null
                  ? placements.data.avg_placement.toFixed(2)
                  : '-'
              }
              subtitle="lower is better"
              icon={Target}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/10"
              accentColor="border-l-blue-500"
              className="bg-[var(--bg-surface)] border-[var(--border-default)]"
            />
            <StatCard
              title="Top 4 Rate"
              value={
                placements.data?.top4_rate != null
                  ? `${(placements.data.top4_rate * 100).toFixed(1)}%`
                  : '-'
              }
              subtitle="podium finishes"
              icon={Award}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10"
              accentColor="border-l-emerald-500"
              className="bg-[var(--bg-surface)] border-[var(--border-default)]"
            />
            <StatCard
              title="Win Rate"
              value={
                placements.data?.win_rate != null
                  ? `${(placements.data.win_rate * 100).toFixed(1)}%`
                  : '-'
              }
              subtitle="1st place finishes"
              icon={Trophy}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10"
              accentColor="border-l-amber-500"
              className="bg-[var(--bg-surface)] border-[var(--border-default)]"
            />
            <StatCard
              title="Total Games"
              value={placements.data?.total_games?.toLocaleString() ?? '-'}
              subtitle="games analyzed"
              icon={BarChart2}
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10"
              accentColor="border-l-violet-500"
              className="bg-[var(--bg-surface)] border-[var(--border-default)]"
            />
          </>
        )}
      </div>

      {placements.error && (
        <ErrorCard message="Failed to load placement data" retry={() => placements.refetch()} />
      )}

      {!placements.isLoading && placements.data?.total_games === 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center shadow-card">
          <Gamepad2
            size={48}
            className="mx-auto mb-4 text-text-secondary opacity-20"
            strokeWidth={1.5}
          />
          <p className="mb-2 text-base font-bold text-text-primary">No games recorded yet</p>
          <p className="mx-auto max-w-xs text-sm text-text-secondary">
            Play some TFT games and come back - your stats will appear here once data has been
            collected.
          </p>
        </div>
      )}

      {tilt.isLoading && (
        <div className="animate-pulse rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <div className="mb-3 h-4 w-40 rounded-full bg-[var(--bg-overlay)]/70" />
          <div className="mb-4 h-3 w-64 rounded-full bg-[var(--bg-overlay)]/70" />
          <div className="h-2 w-full rounded-full bg-[var(--bg-overlay)]/70" />
        </div>
      )}
      {tilt.error && (
        <ErrorCard message="Failed to load tilt status" retry={() => tilt.refetch()} />
      )}
      {tilt.data && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                  tilt.data.is_tilted
                    ? 'border-accent-red/30 bg-accent-red/15 text-accent-red'
                    : 'border-accent-green/30 bg-accent-green/15 text-accent-green'
                )}
              >
                {tilt.data.is_tilted ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-100">
                  {tilt.data.is_tilted ? 'Tilt Detected' : 'Playing Well'}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {tilt.data.recommendation}
                </p>
                {tilt.data.streak_type && tilt.data.streak_type !== 'NONE' && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
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

            <div className="w-full shrink-0 sm:w-72">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-xs text-text-secondary">Tilt Score</span>
                <span className="text-3xl font-bold tabular-nums text-text-primary">
                  {tilt.data.tilt_score}/100
                </span>
              </div>
              <Progress
                percent={Math.max(0, Math.min(100, tilt.data.tilt_score))}
                showInfo={false}
                strokeColor={getTiltStrokeColor(tilt.data.tilt_score)}
                trailColor="rgba(148, 163, 184, 0.2)"
              />
            </div>
          </div>
        </div>
      )}

      <ChartCard
        title="Placement Distribution"
        subtitle="How often you finish in each placement"
        height={220}
        loading={placements.isLoading}
      >
        {!placements.isLoading && placementData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="No placement data yet"
              description="Play some games to see your placement distribution."
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={placementData}
              barSize={30}
              margin={{ top: 6, right: 12, left: -8, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
                width={32}
              />
              <Tooltip
                formatter={(v: number | undefined) => [`${v ?? 0} games`, 'Count']}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {placementData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.placement === 1
                        ? 'var(--accent-primary)'
                        : d.placement <= 4
                        ? 'var(--text-secondary)'
                        : 'var(--text-muted)'
                    }
                    fillOpacity={d.placement <= 4 ? 0.9 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {prof.error && (
        <ErrorCard message="Failed to load proficiency data" retry={() => prof.refetch()} />
      )}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Comp Proficiency</h2>
            <p className="mt-1 text-sm text-slate-400">Your performance vs. the global meta</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              placeholder="Search comp..."
              prefix={<Search size={15} className="text-slate-400" />}
              size="large"
              className="w-full sm:w-64 [&.ant-input-affix-wrapper]:!border-[var(--border-default)] [&.ant-input-affix-wrapper]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400"
            />
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
              <Switch checked={betterThanMetaOnly} onChange={setBetterThanMetaOnly} size="small" />
              <span className="text-xs text-text-secondary">better than meta</span>
            </div>
          </div>
        </div>
        <Table
          rowKey="comp_id"
          columns={profColumns}
          dataSource={proficiencyRows}
          loading={prof.isLoading}
          pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{
            emptyText: (
              <EmptyState
                title="No comp proficiency data"
                description="Try changing filters or play more games."
              />
            ),
          }}
          className={TABLE_CLASS}
        />
      </div>

      {weekly.data && weekly.data.weaknesses.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Weekly Report - Areas to Improve
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Based on your last <span className="tabular-nums">{weekly.data.total_games}</span>{' '}
              games this patch
            </p>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)]">
            {weekly.data.weaknesses.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--bg-elevated)]/40"
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    SEVERITY_STYLES[w.severity]
                  )}
                >
                  {w.severity}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-text-primary">{w.area}</span>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                    {w.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {weekly.data.improvement_tips.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Tips
              </p>
              <ul className="space-y-1">
                {weekly.data.improvement_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                    <span className="mt-0.5 text-accent-gold">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {recentGames.error && (
        <ErrorCard message="Failed to load recent games" retry={() => recentGames.refetch()} />
      )}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Recent Games</h2>
          <p className="mt-1 text-sm text-slate-400">
            {recentRows.length ? (
              <>
                Last <span className="tabular-nums">{recentRows.length}</span> games played
              </>
            ) : (
              'Your latest matches'
            )}
          </p>
        </div>
        <Table
          rowKey="match_id"
          columns={recentColumns}
          dataSource={recentRows}
          loading={recentGames.isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                title="No recent games found"
                description="Your latest matches will appear here."
              />
            ),
          }}
          className={TABLE_CLASS}
        />
      </div>
    </div>
  );
}
