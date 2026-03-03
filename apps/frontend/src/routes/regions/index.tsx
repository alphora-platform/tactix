import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Globe, ArrowRightLeft } from 'lucide-react';
import {
  useRegionalMetaQuery,
  useRegionalExclusiveQuery,
  useRegionCompareQuery,
} from '@/hooks/useAnalytics';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { StatBox } from '@/components/ui/StatBox';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

export const Route = createFileRoute('/regions/')({
  component: RegionsPage,
});

const REGION_COLORS: Record<string, string> = {
  KR: '#c89b3c',
  EUW: '#4fc3f7',
  NA: '#66bb6a',
};

type TabKey = 'divergence' | 'exclusive' | 'compare';

function RegionsPage() {
  const [tab, setTab] = useState<TabKey>('divergence');
  const [regionA, setRegionA] = useState('KR');
  const [regionB, setRegionB] = useState('EUW');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'divergence', label: 'Regional Divergence' },
    { key: 'exclusive', label: 'Region Exclusives' },
    { key: 'compare', label: 'Head-to-Head' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Region Analysis</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          KR / EUW / NA meta divergence and region-exclusive picks
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              tab === key
                ? 'text-accent-gold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent-gold'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'divergence' && <DivergenceTab />}
      {tab === 'exclusive' && <ExclusiveTab />}
      {tab === 'compare' && (
        <CompareTab
          regionA={regionA}
          regionB={regionB}
          onRegionAChange={setRegionA}
          onRegionBChange={setRegionB}
        />
      )}
    </div>
  );
}

function DivergenceTab() {
  const { data, isLoading, error, refetch } = useRegionalMetaQuery();

  if (isLoading)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  if (error) return <ErrorCard message="Failed to load regional data" retry={() => refetch()} />;
  if (!data || data.comps.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary text-sm">
        No cross-region data available for this patch yet.
      </div>
    );
  }

  // Top 10 by regional_diff for radar chart
  const radarData = data.comps.slice(0, 5).map((comp) => ({
    comp: comp.label.length > 10 ? comp.label.slice(0, 10) + '…' : comp.label,
    ...Object.fromEntries(
      Object.entries(comp.by_region).map(([region, stats]) => [region, stats.win_rate])
    ),
  }));

  return (
    <div className="space-y-4">
      {/* Radar chart for top 5 divergent comps */}
      {radarData.length >= 3 && (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Win Rate by Region — Top Divergent Comps
          </h2>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[700px] h-[260px] sm:min-w-0 sm:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2a3040" />
                  <PolarAngleAxis dataKey="comp" tick={{ fill: '#9e9e9e', fontSize: 11 }} />
                  {data.regions.map((region) => (
                    <Radar
                      key={region}
                      name={region}
                      dataKey={region}
                      stroke={REGION_COLORS[region] ?? '#9e9e9e'}
                      fill={REGION_COLORS[region] ?? '#9e9e9e'}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      background: '#161a23',
                      border: '1px solid #2a3040',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)}%`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Divergence table */}
      <div className="space-y-2">
        {data.comps.slice(0, 20).map((comp) => (
          <div key={comp.comp_id} className="rounded-card border border-border bg-bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-text-primary text-sm">{comp.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary">Divergence</span>
                <span className="font-mono text-sm font-bold text-accent-red">
                  {comp.regional_diff.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(comp.by_region).map(([region, stats]) => (
                <div key={region} className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: REGION_COLORS[region] ?? '#9e9e9e',
                      background: `${REGION_COLORS[region] ?? '#9e9e9e'}20`,
                    }}
                  >
                    {region}
                  </span>
                  <span className="text-sm text-text-primary tabular-nums">
                    {stats.win_rate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-text-secondary">#{stats.rank}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExclusiveTab() {
  const { data, isLoading, error, refetch } = useRegionalExclusiveQuery();

  if (isLoading)
    return (
      <div className="grid gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  if (error)
    return <ErrorCard message="Failed to load region exclusives" retry={() => refetch()} />;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary text-sm">
        No region-exclusive picks found for this patch.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary">
        Comps with ≥ 50% win rate in one region but &lt; 45% in all others — high-value intel.
      </p>
      {data.map((comp) => (
        <div key={comp.comp_id} className="rounded-card border border-border bg-bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="font-semibold text-text-primary text-sm">{comp.label}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                color: REGION_COLORS[comp.strong_region] ?? '#9e9e9e',
                background: `${REGION_COLORS[comp.strong_region] ?? '#9e9e9e'}20`,
              }}
            >
              {comp.strong_region} Exclusive
            </span>
          </div>
          <div className="flex gap-4">
            <StatBox
              label={`${comp.strong_region} Win Rate`}
              value={`${comp.strong_win_rate.toFixed(1)}%`}
              accent
            />
            <StatBox label="Other Regions Avg" value={`${comp.other_regions_avg.toFixed(1)}%`} />
            <StatBox label="Sample" value={comp.sample_size.toLocaleString()} />
          </div>
        </div>
      ))}
    </div>
  );
}

const REGIONS = ['KR', 'EUW', 'NA', 'EUNE', 'BR'];

function CompareTab({
  regionA,
  regionB,
  onRegionAChange,
  onRegionBChange,
}: {
  regionA: string;
  regionB: string;
  onRegionAChange: (v: string) => void;
  onRegionBChange: (v: string) => void;
}) {
  const { data, isLoading, error, refetch } = useRegionCompareQuery({ regionA, regionB });

  const selectClass =
    'rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent-gold/60 focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Region pickers */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={regionA}
          onChange={(e) => onRegionAChange(e.target.value)}
          className={selectClass}
        >
          {REGIONS.filter((r) => r !== regionB).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-center -my-1 sm:my-0">
          <ArrowRightLeft size={16} className="text-text-secondary rotate-90 sm:rotate-0" />
        </div>
        <select
          value={regionB}
          onChange={(e) => onRegionBChange(e.target.value)}
          className={selectClass}
        >
          {REGIONS.filter((r) => r !== regionA).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="grid gap-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {error && <ErrorCard message="Failed to compare regions" retry={() => refetch()} />}

      {data && (
        <>
          {/* Similarity score */}
          <div className="rounded-card border border-border bg-bg-card p-4 flex items-center gap-4">
            <Globe size={18} className="text-accent-blue" />
            <div>
              <div className="text-xs text-text-secondary">Meta Similarity Score</div>
              <div className="text-2xl font-bold text-text-primary tabular-nums">
                {(data.meta_similarity * 100).toFixed(1)}%
              </div>
            </div>
            <div className="ml-4 text-xs text-text-secondary max-w-xs">
              {data.meta_similarity > 0.85
                ? 'These regions share a very similar meta.'
                : data.meta_similarity > 0.65
                ? 'Moderate meta divergence between regions.'
                : 'Significantly different metas — check exclusives!'}
            </div>
          </div>

          {/* Head-to-head list */}
          <div className="rounded-card border border-border bg-bg-card overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="text-left px-4 py-2.5 text-xs text-text-secondary font-medium">
                    Comp
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-xs font-medium"
                    style={{ color: REGION_COLORS[regionA] ?? '#9e9e9e' }}
                  >
                    {regionA}
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-xs font-medium"
                    style={{ color: REGION_COLORS[regionB] ?? '#9e9e9e' }}
                  >
                    {regionB}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs text-text-secondary font-medium">
                    Delta
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs text-text-secondary font-medium hidden sm:table-cell">
                    Winner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.comps.map((comp) => (
                  <tr key={comp.comp_id} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary whitespace-nowrap">
                      {comp.label}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: REGION_COLORS[regionA] ?? '#e0e0e0' }}
                    >
                      {comp.region_a_win_rate.toFixed(1)}%
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums"
                      style={{ color: REGION_COLORS[regionB] ?? '#e0e0e0' }}
                    >
                      {comp.region_b_win_rate.toFixed(1)}%
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        comp.delta > 0
                          ? 'text-accent-green'
                          : comp.delta < 0
                          ? 'text-accent-red'
                          : 'text-text-secondary'
                      }`}
                    >
                      {comp.delta > 0 ? '+' : ''}
                      {comp.delta.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-text-secondary hidden sm:table-cell">
                      {comp.winner === 'TIED' ? (
                        '—'
                      ) : (
                        <span style={{ color: REGION_COLORS[comp.winner] ?? '#9e9e9e' }}>
                          {comp.winner}
                        </span>
                      )}
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
