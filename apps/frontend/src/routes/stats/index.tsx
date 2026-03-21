import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button, Input, Switch, Table } from 'antd';
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
  Shield,
  BookOpen,
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
  HIGH: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  MEDIUM: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  LOW: 'text-slate-400 bg-[var(--bg-elevated)] border-[var(--border-default)]',
} as const;

const TABLE_CLASS =
  '[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-surface)] [&_.ant-table-thead>tr>th]:!text-slate-300 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent [&_.ant-table-placeholder]:!bg-transparent [&_.ant-pagination-item]:!border-[var(--border-default)] [&_.ant-pagination-item>a]:!text-slate-300 [&_.ant-pagination-item-active]:!border-[var(--accent-primary)] [&_.ant-pagination-item-active>a]:!text-[var(--accent-primary)] [&_.ant-pagination-prev_.ant-pagination-item-link]:!border-[var(--border-default)] [&_.ant-pagination-next_.ant-pagination-item-link]:!border-[var(--border-default)] [&_.ant-pagination-prev_.ant-pagination-item-link]:!text-slate-300 [&_.ant-pagination-next_.ant-pagination-item-link]:!text-slate-300';

// Placement color by number (1=gold, 2=silver, 3=bronze, 4=emerald, 5-8=rose scale)
function getPlacementBarColor(placement: number): string {
  if (placement === 1) return '#f59e0b';
  if (placement === 2) return '#94a3b8';
  if (placement === 3) return '#cd7f32';
  if (placement === 4) return '#10b981';
  if (placement === 5) return '#f87171';
  if (placement === 6) return '#ef4444';
  if (placement === 7) return '#dc2626';
  return '#991b1b';
}

function getTiltColor(score: number): string {
  if (score > 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function MyStatsPage() {
  const { puuid } = useSettingsStore();

  if (!puuid) {
    return <PuuidPrompt />;
  }

  return <StatsDashboard />;
}

function PuuidPrompt() {
  const setPuuid = useSettingsStore((s) => s.setPuuid);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please enter your PUUID.');
      return;
    }
    // Basic PUUID format check: 78-char hex with dashes
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setError('That doesn\'t look like a valid PUUID. It should be a UUID like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.');
      return;
    }
    setPuuid(trimmed);
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div
          className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.05) 0%, transparent 50%),
              var(--bg-surface)
            `,
          }}
        >
          <div className="mb-6 flex justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border border-(--accent-gold)/30 bg-(--accent-gold)/10"
              style={{ boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
            >
              <User size={36} className="text-(--accent-gold)" />
            </div>
          </div>

          <h1 className="mb-2 text-center font-russo text-2xl font-normal tracking-wide text-slate-100">
            Enter Your PUUID
          </h1>
          <p className="mb-6 text-center text-sm leading-relaxed text-slate-400">
            Paste your Riot PUUID to load your personal stats, tilt detection, and placement history.
          </p>

          <div className="space-y-3">
            <Input
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); }}
              onPressEnter={handleSubmit}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              size="large"
              className="font-mono text-xs"
            />
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertTriangle size={12} />
                {error}
              </p>
            )}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSubmit}
              icon={<Search size={15} />}
            >
              Load My Stats
            </Button>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Find your PUUID at{' '}
            <span className="font-mono text-slate-400">
              /lol-summoner/v1/current-summoner
            </span>{' '}
            in the LCU API, or from your match history via the Riot API.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsDashboard() {
  const { clearAuth, gameName, tagLine } = useSettingsStore();
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
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
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
                'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums',
                better
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
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
            {new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
            className="font-bold tabular-nums"
            style={{ color: getPlacementBarColor(placement) }}
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
          <div className="flex flex-wrap items-center gap-2">
            {gameName && tagLine && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200">
                <User size={14} className="text-[var(--accent-primary)]" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {gameName}#{tagLine}
                </span>
              </span>
            )}
            <Button
              onClick={clearAuth}
              ghost
              icon={<LogOut size={14} />}
              className="!border-[var(--border-default)] !text-slate-300 hover:!border-[var(--accent-primary)]/60 hover:!bg-white/5 hover:!text-slate-100"
            >
              Disconnect
            </Button>
          </div>
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
              iconColor="text-[var(--accent-primary)]"
              iconBg="bg-[var(--accent-primary)]/10"
              accentGradient="from-[var(--accent-primary)] to-[var(--accent-cyan)]"
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
              accentGradient="from-emerald-400 to-green-500"
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
              accentGradient="from-amber-400 to-yellow-500"
            />
            <StatCard
              title="Total Games"
              value={placements.data?.total_games?.toLocaleString() ?? '-'}
              subtitle="games analyzed"
              icon={BarChart2}
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10"
              accentGradient="from-violet-400 to-purple-500"
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
            Play some TFT games and come back — your stats will appear here once data has been
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
                    ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                    : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                )}
              >
                {tilt.data.is_tilted ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
              </div>
              <div className="min-w-0">
                <h2 className="font-russo text-base font-normal text-[var(--text-primary)]">
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
                        tilt.data.streak_type === 'WIN' ? 'text-emerald-400' : 'text-rose-400'
                      }
                    />
                    {tilt.data.streak_length}-game {tilt.data.streak_type.toLowerCase()} streak
                  </p>
                )}
              </div>
            </div>

            {/* Tilt score with conic-gradient gauge */}
            <div className="w-full shrink-0 sm:w-72">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-xs text-text-secondary">Tilt Score</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: getTiltColor(tilt.data.tilt_score) }}
                >
                  {tilt.data.tilt_score}/100
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(0, Math.min(100, tilt.data.tilt_score))}%`,
                    background: `linear-gradient(90deg, ${getTiltColor(0)}, ${getTiltColor(
                      tilt.data.tilt_score
                    )})`,
                    boxShadow: `0 0 8px ${getTiltColor(tilt.data.tilt_score)}50`,
                  }}
                />
              </div>
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
                  background: 'var(--bg-elevated)',
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
                  <Cell key={i} fill={getPlacementBarColor(d.placement)} fillOpacity={0.9} />
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
            <h2 className="font-russo text-base font-normal text-[var(--text-primary)]">
              Comp Proficiency
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Your performance vs. the global meta
            </p>
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
            <h2 className="font-russo text-base font-normal text-[var(--text-primary)]">
              Weekly Report — Areas to Improve
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
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
                    <span className="mt-0.5 text-[var(--accent-gold)]">•</span>
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
          <h2 className="font-russo text-base font-normal text-[var(--text-primary)]">
            Recent Games
          </h2>
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
