import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { User, AlertTriangle, Activity, Award } from 'lucide-react';
import {
  usePlacementsQuery,
  useWeeklyReportQuery,
  useTiltReportQuery,
  useProficiencyQuery,
  useRecentGamesQuery,
} from '@/hooks/useTracker';
import { useSettingsStore } from '@/lib/store/settings.store';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatBox } from '@/components/ui/StatBox';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Route = createFileRoute('/stats/')({
  component: MyStatsPage,
});

function MyStatsPage() {
  const { puuid, setPuuid } = useSettingsStore();
  const [input, setInput] = useState('');

  if (!puuid) {
    return (
      <PuuidPrompt input={input} setInput={setInput} onSubmit={() => setPuuid(input.trim())} />
    );
  }

  return <Statsdashboard />;
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-accent-gold/40 bg-accent-gold/10 mb-2">
          <User size={28} className="text-accent-gold" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Set Your PUUID</h1>
        <p className="text-sm text-text-secondary max-w-xs">
          Enter your Riot PUUID to unlock personal stats, tilt detection, and weekly reports.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && input.trim() && onSubmit()}
          placeholder="Enter your PUUID..."
          className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent-gold/60 focus:outline-none transition-colors"
        />
        <button
          onClick={onSubmit}
          disabled={!input.trim()}
          className="w-full rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-bg-primary hover:bg-accent-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load My Stats
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        Your PUUID is saved locally — never sent to any third-party.
      </p>
    </div>
  );
}

function Statsdashboard() {
  const { clearPuuid } = useSettingsStore();
  const placements = usePlacementsQuery();
  const weekly = useWeeklyReportQuery();
  const tilt = useTiltReportQuery();
  const prof = useProficiencyQuery();
  const recentGames = useRecentGamesQuery(5);

  const placementData =
    placements.data?.distribution.map((d) => ({
      name: `#${d.placement}`,
      count: d.count,
      pct: d.pct,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">My Stats</h1>
          <p className="text-xs text-text-secondary mt-0.5">Personal performance tracker</p>
        </div>
        <button
          onClick={clearPuuid}
          className="text-xs text-text-secondary hover:text-accent-red transition-colors border border-border rounded-lg px-3 py-1.5"
        >
          Switch PUUID
        </button>
      </div>

      {/* Summary row */}
      {placements.isLoading && <SkeletonCard />}
      {placements.data && (
        <div className="rounded-card border border-border bg-bg-card p-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox label="Avg Placement" value={placements.data.avg_placement.toFixed(2)} accent />
          <StatBox label="Top 4 Rate" value={`${(placements.data.top4_rate * 100).toFixed(1)}%`} />
          <StatBox label="Win Rate" value={`${(placements.data.win_rate * 100).toFixed(1)}%`} />
          <StatBox label="Total Games" value={placements.data.total_games} />
        </div>
      )}

      {/* Placement distribution */}
      {placements.data && (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">Placement Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={placementData} barSize={28}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#9e9e9e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9e9e9e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: '#161a23',
                  border: '1px solid #2a3040',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number | undefined) => [`${v ?? 0} games`, 'Count']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {placementData.map((d, i) => (
                  <Cell key={i} fill={i < 4 ? '#c89b3c' : i === 0 ? '#66bb6a' : '#2a3040'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tilt meter */}
      {tilt.data && (
        <div
          className={`rounded-card border p-4 ${
            tilt.data.is_tilted
              ? 'border-accent-red/40 bg-accent-red/5'
              : 'border-border bg-bg-card'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              size={14}
              className={tilt.data.is_tilted ? 'text-accent-red' : 'text-accent-green'}
            />
            <h2 className="text-sm font-semibold text-text-primary">
              {tilt.data.is_tilted ? '⚠️ Tilt Detected' : '✅ Playing Well'}
            </h2>
            <span className="ml-auto text-xs text-text-secondary">
              Score: {tilt.data.tilt_score}/100
            </span>
          </div>
          <p className="text-sm text-text-secondary">{tilt.data.recommendation}</p>
          {tilt.data.streak_type !== 'NONE' && (
            <p className="text-xs text-text-secondary mt-1">
              {tilt.data.streak_length}-game {tilt.data.streak_type.toLowerCase()} streak
            </p>
          )}
        </div>
      )}

      {/* Comp proficiency */}
      {prof.isLoading && <SkeletonCard />}
      {prof.data && prof.data.comps.length > 0 && (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} className="text-accent-gold" />
            <h2 className="text-sm font-semibold text-text-primary">Comp Proficiency</h2>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto sm:max-h-none pr-1 scrollbar-thin">
            {prof.data.comps.slice(0, 8).map((c) => (
              <div
                key={c.comp_id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-bg-elevated transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm text-text-primary truncate block">{c.label}</span>
                  <span className="text-xs text-text-secondary">{c.games_played} games</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatBox label="Avg" value={c.avg_placement.toFixed(2)} />
                  <span
                    className={`text-xs font-medium ${
                      c.skill_delta < 0 ? 'text-accent-green' : 'text-accent-red'
                    }`}
                  >
                    {c.skill_delta < 0 ? '' : '+'}
                    {c.skill_delta.toFixed(2)} vs meta
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly report weaknesses */}
      {weekly.data && weekly.data.weaknesses.length > 0 && (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Weekly Report — Areas to Improve
          </h2>
          <ul className="space-y-2">
            {weekly.data.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 text-xs font-medium rounded px-1.5 py-0.5 border shrink-0 ${
                    w.severity === 'HIGH'
                      ? 'text-accent-red border-accent-red/40 bg-accent-red/10'
                      : w.severity === 'MEDIUM'
                      ? 'text-accent-gold border-accent-gold/40 bg-accent-gold/10'
                      : 'text-text-secondary border-border bg-bg-elevated'
                  }`}
                >
                  {w.severity}
                </span>
                <div>
                  <span className="text-text-primary font-medium">{w.area}:</span>{' '}
                  <span className="text-text-secondary">{w.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Recent Games */}
      {recentGames.data && recentGames.data.length > 0 && (
        <div className="rounded-card border border-border bg-bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Games</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs text-text-secondary font-medium">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-text-secondary font-medium hidden sm:table-cell">
                  Duration
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-text-secondary font-medium">
                  Comp
                </th>
                <th className="text-right px-4 py-2.5 text-xs text-text-secondary font-medium">
                  Place
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentGames.data.map((game) => (
                <tr key={game.match_id} className="hover:bg-bg-elevated transition-colors">
                  <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                    {new Date(game.game_datetime).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap hidden sm:table-cell">
                    {Math.round(game.game_length_minutes)}m
                  </td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">
                    {game.comp_label || 'Unknown'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                    <span
                      className={game.placement <= 4 ? 'text-accent-gold' : 'text-text-secondary'}
                    >
                      #{game.placement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
