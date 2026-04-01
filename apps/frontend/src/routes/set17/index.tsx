import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import {
  Search,
  Swords,
  Shield,
  Crosshair,
  Wand2,
  Skull,
  Shuffle,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { useSet17Champions, useSet17Traits } from '@/lib/hooks/useSet17';
import { cn } from '@/lib/utils/cn';
import type { Set17Champion, Set17Trait } from '@/lib/types/set17';

export const Route = createFileRoute('/set17/')({
  component: Set17Page,
});

/* ─── Cost color config ─────────────────────────────────────────────── */

const COST_CONFIG: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    glow: '',
  },
  2: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: '',
  },
  3: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    glow: '',
  },
  4: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.15)]',
  },
  5: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.2)]',
  },
};

const COST_GRADIENT: Record<number, string> = {
  1: 'from-slate-500 to-slate-600',
  2: 'from-emerald-500 to-emerald-600',
  3: 'from-sky-500 to-sky-600',
  4: 'from-violet-500 to-violet-600',
  5: 'from-amber-400 to-yellow-500',
};

/* ─── Role icons ────────────────────────────────────────────────────── */

const ROLE_ICON: Record<string, typeof Swords> = {
  tank: Shield,
  fighter: Swords,
  carry: Crosshair,
  caster: Wand2,
  assassin: Skull,
  flex: Shuffle,
};

/* ─── Damage type config ────────────────────────────────────────────── */

const DMG_CONFIG: Record<string, { label: string; color: string }> = {
  physical: { label: 'AD', color: 'text-rose-400' },
  magic: { label: 'AP', color: 'text-sky-400' },
  mixed: { label: 'Mix', color: 'text-violet-400' },
};

/* ─── Skeleton Loaders ──────────────────────────────────────────────── */

function ChampionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-(--border-subtle) bg-(--bg-elevated)"
          />
        ))}
      </div>
    </div>
  );
}

function TraitSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-(--border-subtle) bg-(--bg-elevated)"
        />
      ))}
    </div>
  );
}

/* ─── Champion Card ─────────────────────────────────────────────────── */

function ChampionCard({ champion }: { champion: Set17Champion }) {
  const cost = COST_CONFIG[champion.cost] ?? COST_CONFIG[1];
  const gradient = COST_GRADIENT[champion.cost] ?? COST_GRADIENT[1];
  const RoleIcon = ROLE_ICON[champion.role] ?? Sparkles;
  const dmg = DMG_CONFIG[champion.dmgType] ?? DMG_CONFIG.physical;

  return (
    <div
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-200',
        'bg-(--bg-elevated) hover:shadow-card-hover',
        cost.border,
        cost.glow
      )}
    >
      {/* Cost gradient top bar */}
      <div className={cn('h-[3px] bg-linear-to-r', gradient)} />

      <div className="p-3">
        {/* Header: Name + Cost */}
        <div className="mb-2 flex items-start justify-between gap-1">
          <h3 className="font-chakra text-sm font-semibold leading-tight text-(--text-primary)">
            {champion.displayName}
          </h3>
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 font-chakra text-[11px] font-bold',
              cost.bg,
              cost.text
            )}
          >
            {champion.cost}g
          </span>
        </div>

        {/* Role + Damage Type */}
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <RoleIcon size={12} className="text-(--text-secondary)" />
            <span className="font-chakra text-[10px] uppercase tracking-wider text-(--text-secondary)">
              {champion.role}
            </span>
          </div>
          <span className={cn('font-chakra text-[10px] font-bold', dmg.color)}>{dmg.label}</span>
        </div>

        {/* Traits */}
        <div className="flex flex-wrap gap-1">
          {champion.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-md border border-(--border-subtle) bg-(--bg-surface) px-1.5 py-0.5 text-[10px] text-(--text-secondary) transition-colors group-hover:border-(--border-default) group-hover:text-(--text-primary)"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Trait Card ─────────────────────────────────────────────────────── */

function TraitCard({ trait }: { trait: Set17Trait }) {
  const isOrigin = trait.traitType === 'origin';

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border transition-all duration-200',
        'bg-(--bg-elevated) hover:shadow-card-hover',
        isOrigin ? 'border-violet-500/20' : 'border-cyan-500/20'
      )}
    >
      {/* Type gradient top bar */}
      <div
        className={cn(
          'h-[3px] bg-linear-to-r',
          isOrigin ? 'from-violet-500 to-fuchsia-500' : 'from-cyan-500 to-sky-500'
        )}
      />

      <div className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                isOrigin ? 'bg-violet-500/15 text-violet-400' : 'bg-cyan-500/15 text-cyan-400'
              )}
            >
              {isOrigin ? <Sparkles size={14} /> : <Layers size={14} />}
            </div>
            <h3 className="font-chakra text-sm font-semibold text-(--text-primary)">
              {trait.displayName}
            </h3>
          </div>

          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              isOrigin ? 'bg-violet-500/10 text-violet-400' : 'bg-cyan-500/10 text-cyan-400'
            )}
          >
            {trait.traitType}
          </span>
        </div>

        {/* Breakpoints */}
        <div className="mb-2 flex items-center gap-1.5">
          {trait.breakpoints.map((bp, i) => (
            <span
              key={bp}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md font-chakra text-[11px] font-bold',
                i === trait.breakpoints.length - 1
                  ? isOrigin
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-(--bg-surface) text-(--text-secondary)'
              )}
            >
              {bp}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-[11px] leading-relaxed text-(--text-secondary)">{trait.description}</p>
      </div>
    </div>
  );
}

/* ─── Filter Pills ──────────────────────────────────────────────────── */

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer',
        active
          ? 'bg-(--accent-primary)/15 text-(--accent-primary) border border-(--accent-primary)/30'
          : 'bg-(--bg-elevated) text-(--text-secondary) border border-(--border-subtle) hover:border-(--border-default) hover:text-(--text-primary)'
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            active ? 'bg-(--accent-primary)/20' : 'bg-(--bg-surface)'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */

function Set17Page() {
  const championsQuery = useSet17Champions();
  const traitsQuery = useSet17Traits();

  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [traitTab, setTraitTab] = useState<'all' | 'origin' | 'class'>('all');
  const [champCollapsed, setChampCollapsed] = useState(false);
  const [traitsCollapsed, setTraitsCollapsed] = useState(false);

  const champions = championsQuery.data ?? [];
  const traits = traitsQuery.data ?? [];

  /* Filter champions */
  const filteredChampions = useMemo(() => {
    let result = champions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.traits.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (costFilter !== null) {
      result = result.filter((c) => c.cost === costFilter);
    }
    if (roleFilter !== null) {
      result = result.filter((c) => c.role === roleFilter);
    }
    return result;
  }, [champions, search, costFilter, roleFilter]);

  /* Filter traits */
  const filteredTraits = useMemo(() => {
    if (traitTab === 'all') return traits;
    return traits.filter((t) => t.traitType === traitTab);
  }, [traits, traitTab]);

  /* Stats */
  const originCount = traits.filter((t) => t.traitType === 'origin').length;
  const classCount = traits.filter((t) => t.traitType === 'class').length;
  const roles = useMemo(() => {
    const set = new Set(champions.map((c) => c.role));
    return Array.from(set);
  }, [champions]);

  const isLoading = championsQuery.isLoading || traitsQuery.isLoading;
  const isError = championsQuery.isError || traitsQuery.isError;

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Set 17: Space Gods" subtitle="Champion & Trait Database" />
        <ErrorCard
          message="Failed to load Set 17 data"
          retry={() => {
            championsQuery.refetch();
            traitsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-(--border-default)">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 50%, rgba(245,158,11,0.04) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 40%)',
          }}
        />

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span
                  className="inline-flex items-center rounded-lg bg-(--accent-primary)/15 px-2.5 py-1 font-chakra text-[10px] font-bold uppercase tracking-[0.2em] text-(--accent-primary)"
                  style={{ boxShadow: '0 0 12px rgba(139,92,246,0.2)' }}
                >
                  Set 17
                </span>
                <span className="inline-flex items-center rounded-lg bg-amber-500/10 px-2.5 py-1 font-chakra text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  PBE Live
                </span>
              </div>
              <h1 className="font-russo text-3xl font-normal tracking-wide text-(--text-primary) sm:text-4xl">
                SPACE GODS
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-(--text-secondary)">
                Complete database of all {champions.length} champions and {traits.length} traits.
                Search, filter, and explore the Set 17 universe.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-3 sm:gap-4">
              {[
                { label: 'Champions', value: champions.length, color: 'text-violet-400' },
                { label: 'Origins', value: originCount, color: 'text-amber-400' },
                { label: 'Classes', value: classCount, color: 'text-cyan-400' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-(--border-subtle) bg-(--bg-elevated)/60 px-4 py-3 backdrop-blur-sm"
                >
                  <p className={cn('font-chakra text-2xl font-bold', stat.color)}>{stat.value}</p>
                  <p className="font-chakra text-[10px] uppercase tracking-wider text-(--text-secondary)">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search champions or traits..."
          className="w-full rounded-xl border border-(--border-default) bg-(--bg-elevated) py-2.5 pl-10 pr-4 text-sm text-(--text-primary) outline-none transition-colors placeholder:text-(--text-muted) focus:border-(--accent-primary)/50"
        />
      </div>

      {/* ── Champions Section ────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setChampCollapsed((v) => !v)}
          className="mb-4 flex w-full cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-(--accent-primary)" />
            <h2 className="font-russo text-xl font-normal tracking-wide text-(--text-primary)">
              Champions
            </h2>
            <span className="font-chakra text-sm text-(--text-secondary)">
              {filteredChampions.length}
            </span>
          </div>
          {champCollapsed ? (
            <ChevronDown size={18} className="text-(--text-secondary)" />
          ) : (
            <ChevronUp size={18} className="text-(--text-secondary)" />
          )}
        </button>

        {!champCollapsed && (
          <>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              {/* Cost filters */}
              <FilterPill
                label="All"
                active={costFilter === null}
                onClick={() => setCostFilter(null)}
                count={champions.length}
              />
              {[1, 2, 3, 4, 5].map((cost) => {
                const count = champions.filter((c) => c.cost === cost).length;
                return (
                  <FilterPill
                    key={cost}
                    label={`${cost}g`}
                    active={costFilter === cost}
                    onClick={() => setCostFilter(costFilter === cost ? null : cost)}
                    count={count}
                  />
                );
              })}

              <div className="mx-1 w-px bg-(--border-default)" />

              {/* Role filters */}
              {roles.map((role) => {
                const Icon = ROLE_ICON[role] ?? Sparkles;
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                    title={role}
                    className={cn(
                      'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all duration-150',
                      roleFilter === role
                        ? 'border-(--accent-primary)/30 bg-(--accent-primary)/15 text-(--accent-primary)'
                        : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-secondary) hover:border-(--border-default) hover:text-(--text-primary)'
                    )}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            {/* Champion Grid */}
            {isLoading ? (
              <ChampionSkeleton />
            ) : filteredChampions.length === 0 ? (
              <div className="rounded-xl border border-(--border-subtle) bg-(--bg-elevated) px-6 py-10 text-center">
                <p className="text-sm text-(--text-secondary)">No champions match your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredChampions.map((champ) => (
                  <ChampionCard key={champ.apiName} champion={champ} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Traits Section ───────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setTraitsCollapsed((v) => !v)}
          className="mb-4 flex w-full cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-(--accent-cyan)" />
            <h2 className="font-russo text-xl font-normal tracking-wide text-(--text-primary)">
              Traits
            </h2>
            <span className="font-chakra text-sm text-(--text-secondary)">{traits.length}</span>
          </div>
          {traitsCollapsed ? (
            <ChevronDown size={18} className="text-(--text-secondary)" />
          ) : (
            <ChevronUp size={18} className="text-(--text-secondary)" />
          )}
        </button>

        {!traitsCollapsed && (
          <>
            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              {(
                [
                  { key: 'all', label: 'All', count: traits.length },
                  { key: 'origin', label: 'Origins', count: originCount },
                  { key: 'class', label: 'Classes', count: classCount },
                ] as const
              ).map((tab) => (
                <FilterPill
                  key={tab.key}
                  label={tab.label}
                  active={traitTab === tab.key}
                  onClick={() => setTraitTab(tab.key)}
                  count={tab.count}
                />
              ))}
            </div>

            {/* Trait Grid */}
            {isLoading ? (
              <TraitSkeleton />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTraits.map((trait) => (
                  <TraitCard key={trait.apiName} trait={trait} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
