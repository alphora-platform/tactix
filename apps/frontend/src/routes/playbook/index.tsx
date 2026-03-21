import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Swords,
  Sparkles,
  ArrowRightLeft,
  Trophy,
} from 'lucide-react';
import { usePlaybookQuery, usePatchesQuery } from '@/hooks/useAnalytics';
import { useItems, useAugments, useChampions } from '@/lib/hooks/useMetadata';
import { Select } from 'antd';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { TierBadge } from '@/components/ui/TierBadge';
import { cn } from '@/lib/utils/cn';
import { formatWinRate, getPlacementColor, getWinRateColor } from '@/lib/utils/display.utils';
import {
  getItemName,
  getItemIconUrl,
  getAugmentName,
  getAugmentIconUrl,
  getChampionName,
  getChampionSquareUrl,
} from '@/lib/utils/gameAssets';
import type {
  PlaybookCompDto,
  PlaybookCarryDto,
  PlaybookAugmentPathDto,
  PlaybookLevelTimingDto,
  PlaybookFlexRouteDto,
  Tier,
} from '@/lib/types/analytics.types';

export const Route = createFileRoute('/playbook/')({
  component: PlaybookPage,
});

const TIER_TOP_BAR: Record<Tier, string> = {
  S: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 60%, #f59e0b 100%)',
  A: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 50%, #06b6d4 100%)',
  B: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
  C: 'linear-gradient(90deg, #4b5563, #6b7280)',
};

const RANK_STYLES: Record<number, { bg: string; text: string; glow: string }> = {
  1: {
    bg: 'bg-linear-to-br from-amber-500 to-yellow-600',
    text: 'text-white',
    glow: '0 0 12px rgba(245,158,11,0.5)',
  },
  2: {
    bg: 'bg-linear-to-br from-slate-300 to-slate-400',
    text: 'text-slate-900',
    glow: '0 0 10px rgba(148,163,184,0.4)',
  },
  3: {
    bg: 'bg-linear-to-br from-amber-700 to-amber-800',
    text: 'text-amber-100',
    glow: '0 0 10px rgba(180,83,9,0.35)',
  },
};

function getRankStyle(rank: number) {
  return (
    RANK_STYLES[rank] ?? {
      bg: 'bg-(--bg-elevated)',
      text: 'text-slate-300',
      glow: 'none',
    }
  );
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function PlaybookPage() {
  const [localPatch, setLocalPatch] = useState<string | null>(null);
  const [isPbe, setIsPbe] = useState(false);

  const playbookParams = isPbe
    ? { region: 'pbe1' }
    : localPatch
    ? { patch: localPatch }
    : undefined;

  const playbook = usePlaybookQuery(playbookParams);
  const { data: patchesData } = usePatchesQuery();
  const { data: items } = useItems();
  const { data: augments } = useAugments();
  const { data: champions } = useChampions();

  const patchOptions = [
    { value: '', label: patchesData ? `${patchesData.current} (Latest)` : 'Latest' },
    ...(patchesData?.patches
      .filter((p) => p !== patchesData.current)
      .map((p) => ({ value: p, label: p })) ?? []),
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Day-1 Playbook"
        subtitle="Top compositions ranked for climbing — study before you queue"
        actions={
          playbook.data?.updated_at ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-(--border-default) bg-(--bg-surface) px-3 py-1.5 text-xs text-(--text-secondary) sm:self-auto">
              <Clock size={12} />
              Updated {formatTimestamp(playbook.data.updated_at)}
            </span>
          ) : null
        }
      />

      {/* Patch / PBE toolbar */}
      <div className="flex items-center gap-3">
        <Select
          aria-label="Patch selector"
          value={isPbe ? '' : localPatch ?? ''}
          disabled={isPbe}
          options={patchOptions}
          onChange={(value) => setLocalPatch(value || null)}
          className={cn(
            'min-w-[164px]',
            '[&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border [&_.ant-select-selector]:!border-[var(--border-default)]',
            '[&_.ant-select-selector]:!bg-[var(--bg-elevated)] [&_.ant-select-selector]:!shadow-none',
            '[&_.ant-select-selection-item]:!text-sm [&_.ant-select-selection-item]:!text-slate-100',
            isPbe && 'opacity-40'
          )}
          popupClassName="[&_.ant-select-item]:!text-sm [&_.ant-select-item-option-content]:!text-slate-100"
        />

        <button
          type="button"
          onClick={() => setIsPbe((prev) => !prev)}
          className={cn(
            'rounded-lg border px-3 py-1.5 font-chakra text-xs font-semibold uppercase tracking-wider transition-all',
            isPbe
              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400'
              : 'border-(--border-default) bg-(--bg-elevated) text-slate-400 hover:text-slate-200'
          )}
          style={isPbe ? { boxShadow: '0 0 12px rgba(6,182,212,0.3)' } : undefined}
        >
          PBE
        </button>

        {isPbe && (
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            Public Beta
          </span>
        )}
      </div>

      {playbook.error && (
        <ErrorCard message="Failed to load playbook data" retry={() => playbook.refetch()} />
      )}

      {playbook.isLoading && <PlaybookSkeleton />}

      {!playbook.isLoading && playbook.data && playbook.data.comps.length === 0 && (
        <EmptyState
          title="No playbook data"
          description="Playbook data is not available for the current patch."
        />
      )}

      {playbook.data && playbook.data.comps.length > 0 && (
        <div className="space-y-4">
          {playbook.data.comps.map((comp) => (
            <PlaybookCard
              key={comp.comp_id}
              comp={comp}
              items={items}
              augments={augments}
              champions={champions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaybookSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-surface)"
        >
          <div className="h-[3px] bg-(--bg-overlay)/40" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-(--bg-overlay)/70" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded-full bg-(--bg-overlay)/70" />
                <div className="h-3 w-32 rounded-full bg-(--bg-overlay)/60" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaybookCard({
  comp,
  items,
  augments,
  champions,
}: {
  comp: PlaybookCompDto;
  items?: ReturnType<typeof useItems>['data'];
  augments?: ReturnType<typeof useAugments>['data'];
  champions?: ReturnType<typeof useChampions>['data'];
}) {
  const [expanded, setExpanded] = useState(false);
  const tier = comp.tier;
  const topBar = TIER_TOP_BAR[tier] ?? TIER_TOP_BAR.C;
  const rankStyle = getRankStyle(comp.rank);

  return (
    <div className="overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-surface) transition-all duration-200 hover:border-(--accent-primary)/30">
      {/* Tier-colored top stripe */}
      <div className="h-[3px]" style={{ background: topBar }} />

      {/* Main card header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/2"
      >
        {/* Rank badge */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-russo text-lg font-bold',
            rankStyle.bg,
            rankStyle.text
          )}
          style={{ boxShadow: rankStyle.glow }}
        >
          {comp.rank}
        </div>

        {/* Name + tier */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TierBadge tier={tier} size="sm" />
            <h3 className="truncate text-base font-semibold text-slate-100">{comp.label}</h3>
          </div>
        </div>

        {/* Stats row */}
        <div className="hidden items-center gap-5 sm:flex">
          <StatPill
            label="WR"
            value={formatWinRate(comp.win_rate)}
            color={getWinRateColor(comp.win_rate)}
          />
          <StatPill
            label="AVG"
            value={comp.avg_placement.toFixed(2)}
            color={getPlacementColor(Math.round(comp.avg_placement))}
          />
          <StatPill
            label="TOP 4"
            value={formatWinRate(comp.top4_rate)}
            color={getWinRateColor(comp.top4_rate)}
          />
          <span className="font-chakra text-xs tabular-nums text-(--text-muted)">
            {comp.sample_size.toLocaleString()} games
          </span>
        </div>

        {/* Expand icon */}
        <div className="shrink-0 text-slate-500">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Mobile stats row */}
      <div className="flex items-center gap-3 border-t border-(--border-subtle) px-5 py-2.5 sm:hidden">
        <StatPill
          label="WR"
          value={formatWinRate(comp.win_rate)}
          color={getWinRateColor(comp.win_rate)}
        />
        <StatPill
          label="AVG"
          value={comp.avg_placement.toFixed(2)}
          color={getPlacementColor(Math.round(comp.avg_placement))}
        />
        <StatPill
          label="TOP 4"
          value={formatWinRate(comp.top4_rate)}
          color={getWinRateColor(comp.top4_rate)}
        />
        <span className="ml-auto font-chakra text-[10px] tabular-nums text-(--text-muted)">
          {comp.sample_size.toLocaleString()} games
        </span>
      </div>

      {/* Expandable detail section */}
      {expanded && (
        <div className="animate-fade-in space-y-5 border-t border-(--border-subtle) bg-(--bg-base)/50 px-5 py-5">
          {/* Best Items per Carry */}
          {comp.carries.length > 0 && (
            <DetailSection icon={Swords} title="Best Items per Carry">
              <div className="space-y-3">
                {comp.carries.map((carry) => (
                  <CarryRow
                    key={carry.character_id}
                    carry={carry}
                    items={items}
                    champions={champions}
                  />
                ))}
              </div>
            </DetailSection>
          )}

          {/* Augment Paths */}
          <DetailSection icon={Sparkles} title="Augment Paths">
            <AugmentPathSection path={comp.augment_path} augments={augments} />
          </DetailSection>

          {/* Level Timing */}
          {comp.level_timings.length > 0 && (
            <DetailSection icon={Clock} title="Level Timing">
              <LevelTimingTable timings={comp.level_timings} />
            </DetailSection>
          )}

          {/* Flex Routes */}
          {comp.flex_routes.length > 0 && (
            <DetailSection icon={ArrowRightLeft} title="Flex Routes">
              <div className="flex flex-wrap gap-2">
                {comp.flex_routes.map((route) => (
                  <FlexRoutePill key={route.comp_id} route={route} />
                ))}
              </div>
            </DetailSection>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-chakra text-[9px] uppercase tracking-widest text-(--text-muted)">
        {label}
      </span>
      <span className={cn('font-chakra text-sm font-bold tabular-nums', color)}>{value}</span>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Swords;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={14} className="text-(--accent-primary)" />
        <h4 className="font-russo text-sm font-normal tracking-wide text-slate-200">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function CarryRow({
  carry,
  items,
  champions,
}: {
  carry: PlaybookCarryDto;
  items?: ReturnType<typeof useItems>['data'];
  champions?: ReturnType<typeof useChampions>['data'];
}) {
  const champName = getChampionName(carry.character_id, champions);
  const champIcon = getChampionSquareUrl(carry.character_id, champions);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-3 py-2.5">
      {/* Champion icon */}
      {champIcon ? (
        <img
          src={champIcon}
          alt={champName}
          className="h-8 w-8 shrink-0 rounded-lg border border-(--border-subtle) object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-primary)/15 text-xs font-bold text-(--accent-primary)">
          {champName.charAt(0)}
        </div>
      )}
      <span className="min-w-0 shrink-0 text-sm font-medium text-slate-100">{champName}</span>

      {/* Items */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {carry.best_items.map((item) => {
          const name = getItemName(item.item_id, items);
          const icon = getItemIconUrl(item.item_id, items);
          return (
            <div
              key={item.item_id}
              title={`${name} — ${formatWinRate(item.win_rate)} WR`}
              className="group/item relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-(--border-subtle) bg-(--bg-elevated) transition-colors hover:border-(--accent-primary)/40"
            >
              {icon ? (
                <img
                  src={icon}
                  alt={name}
                  className="h-6 w-6 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[9px] font-bold text-slate-400">{name.slice(0, 2)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AugmentPathSection({
  path,
  augments,
}: {
  path: PlaybookAugmentPathDto;
  augments?: ReturnType<typeof useAugments>['data'];
}) {
  const stages = [
    { key: 'stage_2_1' as const, label: 'Stage 2-1' },
    { key: 'stage_3_2' as const, label: 'Stage 3-2' },
    { key: 'stage_4_2' as const, label: 'Stage 4-2' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stages.map(({ key, label }) => (
        <div key={key} className="rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-3">
          <p className="mb-2 font-chakra text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
            {label}
          </p>
          <div className="space-y-1.5">
            {path[key].slice(0, 3).map((aug) => {
              const name = getAugmentName(aug.augment_name, augments);
              const icon = getAugmentIconUrl(aug.augment_name, augments);
              return (
                <div key={aug.augment_name} className="flex items-center gap-2">
                  {icon ? (
                    <img
                      src={icon}
                      alt={name}
                      className="h-5 w-5 shrink-0 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded bg-(--accent-primary)/15" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{name}</span>
                  <span
                    className={cn(
                      'shrink-0 font-chakra text-[11px] font-semibold tabular-nums',
                      getWinRateColor(aug.win_rate)
                    )}
                  >
                    {formatWinRate(aug.win_rate)}
                  </span>
                </div>
              );
            })}
            {path[key].length === 0 && <p className="text-xs text-(--text-muted)">No data</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function LevelTimingTable({ timings }: { timings: PlaybookLevelTimingDto[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-(--border-subtle)">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) bg-(--bg-surface)">
            <th className="px-3 py-2 text-left font-chakra text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
              Level
            </th>
            <th className="px-3 py-2 text-left font-chakra text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
              Typical Round
            </th>
            <th className="px-3 py-2 text-right font-chakra text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
              Gold Needed
            </th>
          </tr>
        </thead>
        <tbody>
          {timings.map((timing) => (
            <tr key={timing.level} className="border-b border-(--border-subtle) last:border-0">
              <td className="px-3 py-2 font-chakra font-semibold tabular-nums text-slate-100">
                Lv {timing.level}
              </td>
              <td className="px-3 py-2 text-slate-300">{timing.typical_round}</td>
              <td className="px-3 py-2 text-right font-chakra tabular-nums text-amber-400">
                {timing.gold_needed}g
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlexRoutePill({ route }: { route: PlaybookFlexRouteDto }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-3 py-2">
      <span className="text-xs font-medium text-slate-200">{route.label}</span>
      <span
        className={cn(
          'font-chakra text-[11px] font-semibold tabular-nums',
          getWinRateColor(route.win_rate)
        )}
      >
        {formatWinRate(route.win_rate)}
      </span>
    </div>
  );
}
