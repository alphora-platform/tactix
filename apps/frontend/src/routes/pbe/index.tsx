import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, FlaskConical, Users } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectorConfig } from '@/lib/api/analytics.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { cn } from '@/lib/utils/cn';
import { formatWinRate, getWinRateColor, getPlacementColor } from '@/lib/utils/display.utils';
import { fetchMeta } from '@/lib/api/analytics.api';
import type { CompStatDto } from '@/lib/types/analytics.types';
import { useRawPlayers } from '@/hooks/useRawData';

export const Route = createFileRoute('/pbe/')({
  component: PbePage,
});

type TabId = 'comps' | 'players';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'comps', label: 'Compositions', icon: <FlaskConical size={14} /> },
  { id: 'players', label: 'Players', icon: <Users size={14} /> },
];

function PbePage() {
  const [activeTab, setActiveTab] = useState<TabId>('comps');

  const configQuery = useQuery({
    queryKey: ['collector-config'],
    queryFn: () => fetchCollectorConfig(),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const compsQuery = useQuery({
    queryKey: ['meta', undefined, 'pbe1', 20],
    queryFn: () => fetchMeta({ region: 'pbe1', limit: 20 }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="PBE Preview"
        subtitle="Early data from the Public Beta Environment — Set 17 testing in progress"
      />

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-cyan-400" />
        <p className="text-sm text-cyan-300/80">
          PBE data is volatile — comps change frequently during patch testing.
        </p>
      </div>

      {/* Collector status card */}
      <div className="rounded-xl border border-(--border-default) bg-(--bg-surface) p-5">
        <div
          className="h-[3px] -mx-5 -mt-5 mb-4 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 50%, #06b6d4 100%)' }}
        />
        <h3 className="font-russo text-sm tracking-wide text-slate-200 mb-3">Collector Status</h3>
        {configQuery.isLoading && (
          <div className="h-6 w-32 animate-pulse rounded bg-(--bg-overlay)/60" />
        )}
        {configQuery.error && (
          <span className="font-chakra text-sm text-slate-400">Status unavailable</span>
        )}
        {configQuery.data && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                configQuery.data.collector_mode === 'pbe' ? 'bg-cyan-400' : 'bg-emerald-400'
              )}
              style={{ animation: 'live-blink 1.5s ease-in-out infinite' }}
            />
            <span className="font-chakra text-sm font-semibold uppercase tracking-wider text-slate-200">
              {configQuery.data.collector_mode === 'pbe' ? 'PBE Mode' : 'Live Mode'}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-(--border-default) bg-(--bg-surface) p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'comps' && (
        <div>
          {compsQuery.error && (
            <ErrorCard
              message="Failed to load PBE composition data"
              retry={() => compsQuery.refetch()}
            />
          )}
          {compsQuery.isLoading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {!compsQuery.isLoading && compsQuery.data && compsQuery.data.length === 0 && (
            <EmptyState
              title="No PBE data"
              description="No compositions found for PBE. Data may not be available yet."
            />
          )}
          {compsQuery.data && compsQuery.data.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {compsQuery.data.map((comp) => (
                <PbeCompCard key={comp.comp_id} comp={comp} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'players' && <PbePlayersTab />}
    </div>
  );
}

function PbePlayersTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useRawPlayers({ region: 'PBE', page, limit: 20 });

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="font-chakra text-xs text-slate-500">
          {data ? `${data.total.toLocaleString()} PBE testers tracked` : ''}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="font-chakra text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      {error && <ErrorCard message="Failed to load PBE players" />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-(--bg-surface)" />
          ))}
        </div>
      )}

      {!isLoading && data?.data.length === 0 && (
        <EmptyState
          title="No PBE players yet"
          description="Seed a PBE player via POST /data-collector/seed-pbe-players to start."
        />
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-(--border-default)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-default) bg-(--bg-surface)">
                <th className="px-4 py-2.5 text-left font-chakra text-[11px] uppercase tracking-widest text-slate-500">
                  Player
                </th>
                <th className="px-4 py-2.5 text-right font-chakra text-[11px] uppercase tracking-widest text-slate-500">
                  W / L
                </th>
                <th className="hidden px-4 py-2.5 text-right font-chakra text-[11px] uppercase tracking-widest text-slate-500 sm:table-cell">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-default) bg-(--bg-elevated)">
              {data.data.map((player) => (
                <tr key={player.puuid} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="truncate font-medium text-slate-200 max-w-[200px]">
                      {player.summonerName || player.puuid.slice(0, 16) + '…'}
                    </p>
                    <p className="font-mono text-[10px] text-slate-600">
                      {player.puuid.slice(0, 20)}…
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-chakra text-sm">
                    <span className="text-emerald-400">{player.wins}W</span>
                    <span className="mx-1 text-slate-600">/</span>
                    <span className="text-rose-400">{player.losses}L</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-chakra text-xs text-slate-500 sm:table-cell">
                    {new Date(player.updatedAt).toLocaleDateString()}
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

function PbeCompCard({ comp }: { comp: CompStatDto }) {
  return (
    <div className="overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-surface) transition-all hover:border-cyan-500/30">
      <div
        className="h-[3px]"
        style={{ background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 50%, #06b6d4 100%)' }}
      />
      <div className="p-4 space-y-3">
        <h4 className="truncate text-sm font-semibold text-slate-100">
          {comp.label || comp.comp_id}
        </h4>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="font-chakra text-[9px] uppercase tracking-widest text-(--text-muted)">
              Win Rate
            </p>
            <p
              className={cn(
                'font-chakra text-sm font-bold tabular-nums',
                getWinRateColor(comp.win_rate)
              )}
            >
              {formatWinRate(comp.win_rate)}
            </p>
          </div>
          <div>
            <p className="font-chakra text-[9px] uppercase tracking-widest text-(--text-muted)">
              Avg Place
            </p>
            <p
              className={cn(
                'font-chakra text-sm font-bold tabular-nums',
                getPlacementColor(Math.round(comp.avg_placement))
              )}
            >
              {comp.avg_placement.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="font-chakra text-[9px] uppercase tracking-widest text-(--text-muted)">
              Games
            </p>
            <p className="font-chakra text-sm font-bold tabular-nums text-slate-200">
              {comp.sample_size.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
