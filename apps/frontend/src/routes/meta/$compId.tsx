import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { useCompDetailQuery, useCompTrendQuery, useMetaQuery } from '@/hooks/useAnalytics';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TierBadge } from '@/components/ui/TierBadge';
import { ChampionSquare } from '@/components/game/ChampionSquare';
import { ItemIcon } from '@/components/game/ItemIcon';
import { AugmentIcon } from '@/components/game/AugmentIcon';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
import { getChampionName } from '@/lib/utils/gameAssets';
import { useChampions } from '@/lib/hooks/useMetadata';

export const Route = createFileRoute('/meta/$compId')({
  component: CompDetailPage,
});

const ROLE_COLORS = {
  core: 'text-accent-gold border-accent-gold/40 bg-accent-gold/10 font-bold',
  flex: 'text-gray-300 border-gray-500/40 bg-gray-500/10',
  optional: 'text-text-secondary border-border bg-bg-elevated',
};

function CompDetailPage() {
  const { compId } = Route.useParams();
  const detail = useCompDetailQuery(compId);
  const trend = useCompTrendQuery(compId);
  const meta = useMetaQuery(30);
  const { data: champions } = useChampions();

  // Find overall stats from meta if loaded
  const stat = meta.data?.find((c) => c.comp_id === compId);

  const trendChartData =
    trend.data?.windows
      .map((w) => ({
        window: w.time_window,
        win_rate: +(w.win_rate * 100).toFixed(1),
      }))
      .reverse() ?? [];

  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Back Header */}
      <div>
        <Link
          to="/meta"
          className="inline-flex items-center gap-1.5 text-sm text-accent-gold hover:text-yellow-300 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Meta List
        </Link>

        {/* HERO SECTION */}
        <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue via-accent-gold to-accent-red opacity-50"></div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {detail.data?.trait_icons && detail.data.trait_icons.length > 0 && (
                  <div className="flex -space-x-1.5 shadow-sm">
                    {detail.data.trait_icons.slice(0, 3).map((icon, i) => (
                      <img
                        key={i}
                        src={icon}
                        alt=""
                        className="w-8 h-8 rounded-md bg-black/60 border border-border/50 relative z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ))}
                  </div>
                )}
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {detail.data?.comp_label || trend.data?.label || 'Unknown Comp'}
                </h1>
              </div>

              {stat ? (
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">Win Rate</span>
                    <span
                      className={cn(
                        'font-bold',
                        stat.win_rate * 100 >= 50 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {(stat.win_rate * 100).toFixed(1)}%
                    </span>
                    {stat.trend_direction === 'RISING' && (
                      <ArrowUp size={14} className="text-green-400" strokeWidth={3} />
                    )}
                    {stat.trend_direction === 'FALLING' && (
                      <ArrowDown size={14} className="text-red-500" strokeWidth={3} />
                    )}
                  </div>
                  <div className="w-px h-3 bg-border/80"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">Top 4</span>
                    <span className="text-white">{(stat.top4_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-px h-3 bg-border/80"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">Avg</span>
                    <span className="text-white">{stat.avg_placement.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-3 bg-border/80"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted">
                      {stat.sample_size.toLocaleString()} games
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-5">
                  <Skeleton className="w-64 h-full" />
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {stat?.tier && (
                <div className="scale-110 origin-right">
                  <TierBadge tier={stat.tier} size="lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {detail.isLoading && (
        <div className="grid gap-6">
          <SkeletonCard />
          <div className="grid md:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {detail.error && (
        <ErrorCard message="Failed to load comp details" retry={() => detail.refetch()} />
      )}

      {detail.data && (
        <>
          {/* CHAMPIONS BOARD SECTION */}
          <section>
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest pl-2 mb-4">
              Core Board
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {detail.data.unit_priority
                .sort((a, b) => {
                  if (a.role !== b.role) {
                    const roleScore = { core: 3, flex: 2, optional: 1 };
                    return roleScore[b.role] - roleScore[a.role];
                  }
                  return b.avg_tier - a.avg_tier;
                })
                .slice(0, 10)
                .map((unit) => {
                  const carryItems =
                    detail.data!.best_items.find((b) => b.unit === unit.character_id)?.combos[0]
                      ?.items || [];
                  const name = getChampionName(unit.character_id, champions);

                  return (
                    <div
                      key={unit.character_id}
                      className="rounded-xl border border-border/60 bg-bg-card/40 p-3 flex flex-col items-center justify-between text-center min-h-[140px] hover:border-accent-gold/30 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="mb-2">
                        <span
                          className={cn(
                            'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm',
                            ROLE_COLORS[unit.role]
                          )}
                        >
                          {unit.role}
                        </span>
                      </div>
                      <div className="relative mb-2 shrink-0">
                        <ChampionSquare
                          apiName={unit.character_id}
                          size="lg"
                          showCost
                          showStars={Math.round(unit.avg_tier)}
                        />
                      </div>
                      <div className="text-sm font-bold text-text-primary truncate w-full px-1">
                        {name}
                      </div>

                      <div className="h-6 mt-2 flex gap-1 justify-center items-center">
                        {carryItems.slice(0, 3).map((item, i) => (
                          <ItemIcon key={i} apiName={item} size="sm" />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* AUGMENT PATH SECTION */}
            <section>
              <div className="rounded-2xl border border-border bg-bg-card p-5 h-full flex flex-col">
                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-5">
                  Optimal Augments
                </h2>
                <div className="grid grid-cols-3 gap-4 flex-1">
                  {/* Stage 2-1 */}
                  <div>
                    <div className="text-xs font-bold text-text-muted text-center pb-2 mb-3 border-b border-border/50">
                      Stage 2-1
                    </div>
                    <ul className="space-y-2">
                      {detail.data.augment_path.stage_2_1?.slice(0, 3).map((aug, i) => (
                        <li
                          key={i}
                          className="flex flex-col items-center sm:flex-row sm:items-start gap-2 bg-bg-elevated/50 p-2 rounded-lg text-center sm:text-left"
                        >
                          <AugmentIcon apiName={aug.augment_name} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <div
                              className="text-xs font-semibold text-text-primary truncate w-full max-w-[80px]"
                              title={aug.augment_name}
                            >
                              {aug.augment_name.replace(/TFT.+_/, '')}
                            </div>
                            <div className="text-[10px] text-green-400 font-mono">
                              {(aug.win_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Stage 3-2 */}
                  <div>
                    <div className="text-xs font-bold text-text-muted text-center pb-2 mb-3 border-b border-border/50">
                      Stage 3-2
                    </div>
                    <ul className="space-y-2">
                      {detail.data.augment_path.stage_3_2?.slice(0, 3).map((aug, i) => (
                        <li
                          key={i}
                          className="flex flex-col items-center sm:flex-row sm:items-start gap-2 bg-bg-elevated/50 p-2 rounded-lg text-center sm:text-left"
                        >
                          <AugmentIcon apiName={aug.augment_name} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <div
                              className="text-xs font-semibold text-text-primary truncate w-full max-w-[80px]"
                              title={aug.augment_name}
                            >
                              {aug.augment_name.replace(/TFT.+_/, '')}
                            </div>
                            <div className="text-[10px] text-green-400 font-mono">
                              {(aug.win_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Stage 4-2 */}
                  <div>
                    <div className="text-xs font-bold text-text-muted text-center pb-2 mb-3 border-b border-border/50">
                      Stage 4-2
                    </div>
                    <ul className="space-y-2">
                      {detail.data.augment_path.stage_4_2?.slice(0, 3).map((aug, i) => (
                        <li
                          key={i}
                          className="flex flex-col items-center sm:flex-row sm:items-start gap-2 bg-bg-elevated/50 p-2 rounded-lg text-center sm:text-left"
                        >
                          <AugmentIcon apiName={aug.augment_name} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <div
                              className="text-xs font-semibold text-text-primary truncate w-full max-w-[80px]"
                              title={aug.augment_name}
                            >
                              {aug.augment_name.replace(/TFT.+_/, '')}
                            </div>
                            <div className="text-[10px] text-green-400 font-mono">
                              {(aug.win_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* TREND CHART SECTION */}
            <section className="flex flex-col h-full">
              <div className="rounded-2xl border border-border bg-bg-card p-5 h-full flex flex-col">
                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Trend (Win Rate %)
                </h2>
                {trend.isLoading && (
                  <div className="flex-1 min-h-[200px] flex items-center justify-center">
                    <Skeleton className="w-full h-full" />
                  </div>
                )}
                {trend.data && trendChartData.length > 0 && (
                  <div className="flex-1 min-h-[200px] mt-2 w-full ml-[-20px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData}>
                        <defs>
                          <linearGradient id="wrFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="window"
                          tick={{ fill: '#737373', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tick={{ fill: '#737373', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#1c1c24',
                            border: '1px solid #333333',
                            borderRadius: 12,
                            fontSize: 12,
                            color: '#fff',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                          }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="win_rate"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="url(#wrFill)"
                          animationDuration={1000}
                          dot={{ r: 4, fill: '#1c1c24', stroke: '#3b82f6', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* CARRY ITEMS BREAKDOWN */}
          <section>
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest pl-2 mb-4">
              Carry Items Breakdown
            </h2>
            <div className="space-y-3">
              {detail.data.best_items.map((b) => {
                const unitPriority = detail.data!.unit_priority.find(
                  (u) => u.character_id === b.unit
                );
                const role = unitPriority?.role || 'optional';
                const name = getChampionName(b.unit, champions);
                const isExpanded = expandedUnit === b.unit;
                const topCombo = b.combos[0];

                if (!topCombo) return null;

                return (
                  <div
                    key={b.unit}
                    className="rounded-xl border border-border bg-bg-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedUnit(isExpanded ? null : b.unit)}
                      className="w-full text-left px-5 py-3 hover:bg-bg-elevated transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <ChampionSquare
                          apiName={b.unit}
                          size="sm"
                          showCost
                          className="w-10 h-10 rounded shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-primary text-base">{name}</span>
                            <span
                              className={cn(
                                'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded',
                                ROLE_COLORS[role]
                              )}
                            >
                              {role}
                            </span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            Top WR: {(topCombo.win_rate * 100).toFixed(1)}% ({topCombo.sample_size}{' '}
                            games)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-80">
                        {topCombo.items.map((item, i) => (
                          <ItemIcon key={i} apiName={item} size="md" />
                        ))}
                        <span
                          className="ml-2 text-text-secondary transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                        >
                          ▼
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 bg-black/10 border-t border-border/50">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="text-text-muted text-xs border-b border-border/40">
                              <th className="py-2 w-48 font-semibold">Combo</th>
                              <th className="py-2 text-right font-semibold">Win Rate</th>
                              <th className="py-2 px-4 text-right font-semibold">Games</th>
                              <th className="py-2 hidden sm:table-cell font-semibold">
                                Relative WR Bar
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.combos.slice(0, 5).map((combo, idx) => {
                              const winRate = combo.win_rate * 100;
                              // Max winrate among combos to scale the bar
                              const maxWR = b.combos[0].win_rate * 100;
                              const barWidth = `${Math.min(100, (winRate / (maxWR || 1)) * 100)}%`;

                              return (
                                <tr
                                  key={idx}
                                  className="border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors"
                                >
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      {combo.items.map((item, k) => (
                                        <ItemIcon key={k} apiName={item} size="sm" />
                                      ))}
                                    </div>
                                  </td>
                                  <td
                                    className={cn(
                                      'py-2.5 text-right font-bold',
                                      winRate >= 50 ? 'text-green-400' : 'text-yellow-200'
                                    )}
                                  >
                                    {winRate.toFixed(1)}%
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-text-secondary font-mono text-xs">
                                    {combo.sample_size}
                                  </td>
                                  <td className="py-2.5 hidden sm:table-cell w-1/3">
                                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-accent-blue transition-all"
                                        style={{ width: barWidth }}
                                      ></div>
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
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
