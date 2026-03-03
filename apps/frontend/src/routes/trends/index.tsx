import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMetaQuery } from '@/hooks/useAnalytics';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TierBadge } from '@/components/ui/TierBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, TrendingDown, BarChart2 } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

export const Route = createFileRoute('/trends/')({
  component: TrendsPage,
});

function TrendsPage() {
  const meta = useMetaQuery(30);
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!meta.data) return [];

    // Dedup by comp_id for display
    const dedupMap = new Map();
    for (const comp of meta.data) {
      const existing = dedupMap.get(comp.comp_id);
      if (!existing || existing.sample_size < comp.sample_size) {
        dedupMap.set(comp.comp_id, comp);
      }
    }
    return Array.from(dedupMap.values());
  }, [meta.data]);

  const chartData = useMemo(() => {
    return data
      .slice(0, 15)
      .map((c) => {
        let label = c.comp_label || c.label;
        if (label.length > 20) label = label.substring(0, 20) + '...';
        return {
          comp_id: c.comp_id,
          comp_label: label,
          full_label: c.comp_label || c.label,
          win_rate_pct: +(c.win_rate * 100).toFixed(1),
        };
      })
      .sort((a, b) => a.win_rate_pct - b.win_rate_pct); // Sort desc structurally for Recharts to show top-to-bottom
  }, [data]);

  const rising = useMemo(
    () => data.filter((c) => c.trend_direction === 'RISING').slice(0, 5),
    [data]
  );
  const falling = useMemo(
    () => data.filter((c) => c.trend_direction === 'FALLING').slice(0, 5),
    [data]
  );

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Meta Trends</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Track composition win rate momentum over time
        </p>
      </div>

      {meta.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {meta.error && <ErrorCard message="Failed to load trends" retry={() => meta.refetch()} />}

      {meta.data && (
        <>
          {/* RISING / FALLING SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rising */}
            <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-orange-500 w-5 h-5" />
                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                  Rising (last 24h)
                </h2>
              </div>
              <ul className="space-y-3">
                {rising.length > 0 ? (
                  rising.map((c) => (
                    <li key={c.comp_id} className="flex items-center justify-between group">
                      <Link
                        to="/meta/$compId"
                        params={{ compId: c.comp_id }}
                        className="flex flex-1 items-center gap-2 min-w-0"
                      >
                        {c.trait_icons?.[0] && (
                          <img
                            src={c.trait_icons[0]}
                            alt=""
                            className="w-5 h-5 rounded bg-black/50"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-sm font-bold text-text-primary group-hover:text-accent-gold transition-colors truncate">
                          {c.comp_label || c.label}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-secondary">
                          {(c.win_rate * 100).toFixed(1)}% WR
                        </span>
                        <span className="text-xs font-bold text-green-400 drop-shadow-sm">
                          ↑ RISING
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-text-muted italic">No rising comps detected.</p>
                )}
              </ul>
            </div>

            {/* Falling */}
            <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="text-blue-400 w-5 h-5" />
                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                  Falling (last 24h)
                </h2>
              </div>
              <ul className="space-y-3">
                {falling.length > 0 ? (
                  falling.map((c) => (
                    <li key={c.comp_id} className="flex items-center justify-between group">
                      <Link
                        to="/meta/$compId"
                        params={{ compId: c.comp_id }}
                        className="flex flex-1 items-center gap-2 min-w-0"
                      >
                        {c.trait_icons?.[0] && (
                          <img
                            src={c.trait_icons[0]}
                            alt=""
                            className="w-5 h-5 rounded bg-black/50"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-sm font-bold text-text-primary group-hover:text-accent-gold transition-colors truncate">
                          {c.comp_label || c.label}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-secondary">
                          {(c.win_rate * 100).toFixed(1)}% WR
                        </span>
                        <span className="text-xs font-bold text-red-400 drop-shadow-sm">
                          ↓ FALLING
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-text-muted italic">No falling comps detected.</p>
                )}
              </ul>
            </div>
          </div>

          {/* HORIZONTAL BAR CHART */}
          <div className="rounded-xl border border-border bg-bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="text-accent-blue w-5 h-5" />
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                Top Win Rates
              </h2>
            </div>
            <div className="w-full" style={{ height: Math.max(400, chartData.length * 35) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#737373', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="comp_label"
                    width={180}
                    tick={{ fill: '#f3f4f6', fontSize: 13, fontWeight: 500 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff0a' }}
                    contentStyle={{
                      background: '#161a23',
                      border: '1px solid #2a3040',
                      borderRadius: 8,
                      fontSize: 13,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      color: '#fff',
                    }}
                    formatter={(val: number) => [`${val}%`, 'Win Rate']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.full_label;
                      }
                      return label;
                    }}
                  />
                  <Bar
                    dataKey="win_rate_pct"
                    fill="url(#barGrad)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    minPointSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="rounded-xl border border-border bg-bg-card shadow-sm overflow-x-auto">
            <div className="p-4 border-b border-border/50">
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                All Comps Trends
              </h2>
            </div>
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-secondary border-b border-border/50 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Tier</th>
                  <th className="px-5 py-3 font-semibold">Comp</th>
                  <th className="px-5 py-3 font-semibold text-center">Trend</th>
                  <th className="px-5 py-3 font-semibold text-right">Win %</th>
                  <th className="px-5 py-3 font-semibold text-right">Top 4 %</th>
                  <th className="px-5 py-3 font-semibold text-right">Avg Place</th>
                  <th className="px-5 py-3 font-semibold text-right">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.map((comp) => (
                  <tr
                    key={comp.comp_id}
                    className="hover:bg-bg-elevated/50 cursor-pointer group transition-colors"
                    onClick={() =>
                      navigate({ to: '/meta/$compId', params: { compId: comp.comp_id } })
                    }
                  >
                    <td className="px-5 py-3 w-16">
                      {comp.tier ? (
                        <TierBadge tier={comp.tier} size="sm" />
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {comp.trait_icons?.[0] && (
                          <img
                            src={comp.trait_icons[0]}
                            alt=""
                            className="w-6 h-6 rounded bg-black/50 border border-border/50"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="font-bold text-text-primary group-hover:text-accent-gold transition-colors">
                          {comp.comp_label || comp.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {comp.trend_direction === 'RISING' && (
                        <span className="text-green-400 font-black text-lg drop-shadow-[0_0_2px_rgba(74,222,128,0.5)]">
                          ↑
                        </span>
                      )}
                      {comp.trend_direction === 'FALLING' && (
                        <span className="text-red-500 font-black text-lg drop-shadow-[0_0_2px_rgba(239,68,68,0.5)]">
                          ↓
                        </span>
                      )}
                      {(comp.trend_direction === 'STABLE' || !comp.trend_direction) && (
                        <span className="text-gray-500 font-bold text-lg">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={cn(
                          'font-bold',
                          comp.win_rate * 100 >= 50 ? 'text-green-400' : 'text-text-primary'
                        )}
                      >
                        {(comp.win_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary font-medium">
                      {(comp.top4_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary font-mono text-xs">
                      {comp.avg_placement.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-secondary font-mono text-xs">
                      {comp.sample_size.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
