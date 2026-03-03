import { createFileRoute, Link } from '@tanstack/react-router';
import { useMetaQuery, useTierListQuery } from '@/hooks/useAnalytics';
import { useMemo, useState } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import type { CompStatDto, TierCompEntry } from '@/lib/types/analytics.types';
import { cn } from '@/lib/utils/cn';
import { ChampionSquare } from '@/components/game/ChampionSquare';

export const Route = createFileRoute('/meta/')({
  component: MetaOverviewPage,
});

type SortOption = 'Win Rate' | 'Top 4' | 'Avg Placement' | 'Play Count';

function MetaOverviewPage() {
  const meta = useMetaQuery(30);
  const tierList = useTierListQuery();

  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('Win Rate');

  // Dedup and process
  const uniqueComps = useMemo(() => {
    if (!meta.data) return [];

    // Dedup by comp_id, keeping the one with higher sample_size
    const dedupMap = new Map<string, CompStatDto>();
    for (const comp of meta.data) {
      const existing = dedupMap.get(comp.comp_id);
      if (!existing || existing.sample_size < comp.sample_size) {
        dedupMap.set(comp.comp_id, comp);
      }
    }

    let arr = Array.from(dedupMap.values());

    // Filter by search
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
          return a.avg_placement - b.avg_placement; // lower is better
        case 'Play Count':
          return b.sample_size - a.sample_size;
        default:
          return 0;
      }
    });

    return arr;
  }, [meta.data, search, sortOption]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Meta Overview</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Best compositions ranked by performance across all regions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-md py-3 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition-all">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
          <input
            type="text"
            placeholder="Search comp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-gold transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <div className="flex items-center gap-2 shrink-0 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm">
            <span className="text-text-secondary">Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-text-primary focus:outline-none cursor-pointer appearance-none pr-4"
            >
              <option value="Win Rate">Win Rate</option>
              <option value="Top 4">Top 4</option>
              <option value="Avg Placement">Avg Placement</option>
              <option value="Play Count">Play Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tier List summary */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Tier List
        </h2>
        {tierList.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {tierList.error && (
          <ErrorCard message="Failed to load tier list" retry={() => tierList.refetch()} />
        )}
        {tierList.data && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start">
            {(['S', 'A', 'B', 'C'] as const).map((tier) => (
              <TierSection key={tier} tier={tier} comps={tierList.data.tiers[tier]} />
            ))}
          </div>
        )}
      </section>

      {/* Full comp list */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Top Comps
        </h2>
        {meta.isLoading && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {meta.error && (
          <ErrorCard message="Failed to load meta data" retry={() => meta.refetch()} />
        )}
        {meta.data && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {uniqueComps.map((comp) => (
              <CompCard key={comp.comp_id} comp={comp} />
            ))}
            {uniqueComps.length === 0 && (
              <div className="col-span-full py-10 text-center text-text-muted">
                No comps found matching "{search}"
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TierSection({ tier, comps }: { tier: 'S' | 'A' | 'B' | 'C'; comps: TierCompEntry[] }) {
  const tierColors = {
    S: 'border-accent-gold text-accent-gold bg-accent-gold/10',
    A: 'border-blue-400 text-blue-400 bg-blue-400/10',
    B: 'border-gray-400 text-gray-400 bg-gray-400/10',
    C: 'border-text-muted text-text-muted bg-text-muted/10',
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden flex flex-col h-full">
      <div className={cn('px-4 py-2 border-b flex items-center justify-between', tierColors[tier])}>
        <div className="flex items-center gap-3">
          <span className="font-black text-xl">{tier} TIER</span>
          <div className="h-0.5 flex-1 bg-current opacity-30 min-w-[50px]"></div>
        </div>
        <span className="text-xs font-medium opacity-80 whitespace-nowrap ml-4">
          {comps.length} comps {comps.length > 0 ? 'this patch' : ''}
        </span>
      </div>
      {comps.length > 0 ? (
        <ul className="divide-y divide-border">
          {comps.slice(0, 5).map((comp) => (
            <li key={comp.comp_id}>
              <Link
                to="/meta/$compId"
                params={{ compId: comp.comp_id }}
                className="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {comp.trait_icons?.[0] && (
                    <img
                      src={comp.trait_icons[0]}
                      alt=""
                      className="w-5 h-5 rounded opacity-80"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-gold transition-colors">
                    {comp.comp_label || comp.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs font-mono text-text-secondary bg-black/30 px-1.5 py-0.5 rounded">
                    Avg {comp.avg_placement.toFixed(2)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-sm text-text-muted text-center py-8">0 comps this patch</div>
      )}
    </div>
  );
}

function CompCard({ comp }: { comp: CompStatDto & { core_units?: string[] } }) {
  const winRate = comp.win_rate * 100;
  const top4Rate = comp.top4_rate * 100;

  let winRateColor = 'text-green-400';
  if (winRate < 45) winRateColor = 'text-red-400';
  else if (winRate < 55) winRateColor = 'text-yellow-400';

  // Fallback core units for display since backend doesn't provide them yet
  const units = comp.core_units || [];
  const displayUnits = units.slice(0, 6);
  const excessUnits = Math.max(0, units.length - 6);

  return (
    <Link
      to="/meta/$compId"
      params={{ compId: comp.comp_id }}
      className="block rounded-xl border border-border bg-bg-card p-4 hover:border-accent-gold/40 hover:bg-bg-elevated hover:-translate-y-0.5 transition-all duration-200 group relative shadow-sm"
    >
      {/* Top Row: Traits & Label */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {comp.trait_icons && comp.trait_icons.length > 0 ? (
            <div className="flex -space-x-1 shrink-0">
              {comp.trait_icons.slice(0, 2).map((icon, i) => (
                <img
                  key={i}
                  src={icon}
                  alt=""
                  className="w-6 h-6 rounded bg-black/50 border border-border relative z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          ) : (
            comp.tier && <TierBadge tier={comp.tier} size="md" />
          )}
          <span className="font-bold text-text-primary truncate group-hover:text-accent-gold transition-colors text-base ml-1">
            {comp.comp_label || comp.label}
          </span>
        </div>
        {comp.trend_direction && comp.trend_direction !== 'STABLE' && (
          <div className="shrink-0 flex items-center justify-center">
            {comp.trend_direction === 'RISING' ? (
              <ArrowUp className="w-4 h-4 text-green-400" strokeWidth={3} />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500" strokeWidth={3} />
            )}
          </div>
        )}
      </div>

      {/* Champion Row */}
      {units.length > 0 ? (
        <div className="flex items-center gap-1.5 mb-5">
          {displayUnits.map((u, i) => (
            <ChampionSquare key={i} apiName={u} size="sm" showCost className="w-8 h-8 rounded-md" />
          ))}
          {excessUnits > 0 && (
            <div className="w-8 h-8 rounded-md bg-black/40 border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
              +{excessUnits}
            </div>
          )}
        </div>
      ) : (
        <div className="h-10 mb-5 flex items-center">
          <span className="text-xs text-text-muted italic">Core units info unavailable</span>
        </div>
      )}

      {/* Bottom Stats Row */}
      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center divide-x divide-border/50">
          <div className="pr-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Win
            </div>
            <div className={cn('text-sm font-bold', winRateColor)}>{winRate.toFixed(1)}%</div>
          </div>
          <div className="px-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Top 4
            </div>
            <div className="text-sm font-bold text-text-primary">{top4Rate.toFixed(1)}%</div>
          </div>
          <div className="pl-3">
            <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-0.5">
              Avg
            </div>
            <div className="text-sm font-bold text-text-primary">
              {comp.avg_placement.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block bg-black/20 text-text-muted text-[10px] px-2 py-1 rounded font-medium">
            {comp.sample_size.toLocaleString()} games
          </span>
        </div>
      </div>
    </Link>
  );
}
