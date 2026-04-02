import { createFileRoute } from '@tanstack/react-router';
import { Input, message } from 'antd';
import {
  Settings,
  Wifi,
  WifiOff,
  FlaskConical,
  Globe,
  Database,
  Trash2,
  Users,
  FileText,
  BarChart2,
  AlertTriangle,
  X,
  ExternalLink,
  Play,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import {
  useCrawlSettings,
  useUpdateCrawlSettings,
  useDbStats,
  useCollectPlayers,
  useCollectMatches,
  useRefreshViews,
} from '@/hooks/useSettings';
import { useEnqueuePurge } from '@/hooks/useJobs';

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
});

const ALL_REGIONS: { value: string; label: string }[] = [
  { value: 'kr', label: 'KR' },
  { value: 'euw1', label: 'EUW' },
  { value: 'na1', label: 'NA' },
  { value: 'eune1', label: 'EUNE' },
  { value: 'br1', label: 'BR' },
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
  { value: 'oc1', label: 'OCE' },
  { value: 'tr1', label: 'TR' },
  { value: 'ru', label: 'RU' },
  { value: 'jp1', label: 'JP' },
  { value: 'sg2', label: 'SG' },
  { value: 'tw2', label: 'TW' },
  { value: 'vn2', label: 'VN' },
];

function SettingsPage() {
  const { data: settings, isLoading } = useCrawlSettings();
  const { mutate: update, isPending } = useUpdateCrawlSettings();

  const [mode, setMode] = useState<'pbe' | 'official'>('official');
  const [regions, setRegions] = useState<string[]>([]);
  const [patch, setPatch] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Sync local state when settings load
  useEffect(() => {
    if (!settings) return;
    setMode(settings.crawlMode);
    setRegions(settings.activeRegions);
    setPatch(settings.activePatch ?? '');
    setEnabled(settings.isEnabled);
  }, [settings]);

  const save = () => {
    update(
      {
        crawlMode: mode,
        activeRegions: mode === 'pbe' ? ['pbe1'] : regions,
        activePatch: patch.trim() || null,
        isEnabled: enabled,
      },
      {
        onSuccess: () => message.success('Settings saved'),
        onError: () => message.error('Failed to save settings'),
      }
    );
  };

  const toggleRegion = (region: string) => {
    setRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Crawl configuration" />
        <div className="h-48 animate-pulse rounded-xl bg-(--bg-surface)" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure the data crawler behaviour." />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* Master toggle */}
        <div className="rounded-xl border border-(--border-default) bg-(--bg-surface) p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {enabled ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Wifi size={18} className="text-emerald-400" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/15">
                  <WifiOff size={18} className="text-slate-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-slate-100">Enable Crawling</p>
                <p className="text-xs text-slate-500">
                  {enabled ? 'Collecting match data' : 'Paused — no data will be collected'}
                </p>
              </div>
            </div>

            {/* Pill toggle */}
            <button
              onClick={() => setEnabled((v) => !v)}
              className={cn(
                'relative flex h-8 w-34 shrink-0 items-center rounded-lg border p-0.5 transition-all duration-200',
                enabled
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-(--border-default) bg-(--bg-elevated)'
              )}
            >
              {/* Sliding indicator */}
              <span
                className={cn(
                  'absolute h-6.5 w-16 rounded-md transition-all duration-200',
                  enabled ? 'left-0.5 bg-emerald-500/25' : 'left-16.75 bg-slate-600/40'
                )}
              />
              <span
                className={cn(
                  'relative z-10 flex flex-1 items-center justify-center gap-1 text-[11px] font-semibold tracking-wide transition-colors duration-200',
                  enabled ? 'text-emerald-400' : 'text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors duration-200',
                    enabled ? 'bg-emerald-400' : 'bg-slate-600'
                  )}
                  style={
                    enabled ? { animation: 'live-blink 1.5s ease-in-out infinite' } : undefined
                  }
                />
                ON
              </span>
              <span
                className={cn(
                  'relative z-10 flex flex-1 items-center justify-center text-[11px] font-semibold tracking-wide transition-colors duration-200',
                  !enabled ? 'text-slate-400' : 'text-slate-600'
                )}
              >
                OFF
              </span>
            </button>
          </div>
        </div>

        {/* Crawl mode */}
        <div
          className={cn(
            'rounded-xl border border-(--border-default) bg-(--bg-surface) p-5 transition-opacity',
            !enabled && 'pointer-events-none opacity-40'
          )}
        >
          <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
            <Settings size={16} className="text-(--accent-primary)" />
            Crawl Mode
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Official */}
            <button
              onClick={() => setMode('official')}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                mode === 'official'
                  ? 'border-(--accent-primary) bg-(--accent-primary)/10'
                  : 'border-(--border-default) bg-(--bg-elevated) hover:border-(--accent-primary)/40'
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <Globe
                  size={16}
                  className={mode === 'official' ? 'text-(--accent-primary)' : 'text-slate-400'}
                />
                <span
                  className={cn(
                    'font-chakra font-semibold',
                    mode === 'official' ? 'text-(--accent-primary)' : 'text-slate-300'
                  )}
                >
                  Official
                </span>
                {mode === 'official' && (
                  <span className="ml-auto rounded-full bg-(--accent-primary)/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-(--accent-primary) uppercase">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Live ranked servers — production data</p>
            </button>

            {/* PBE */}
            <button
              onClick={() => setMode('pbe')}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                mode === 'pbe'
                  ? 'border-amber-500/60 bg-amber-500/10'
                  : 'border-(--border-default) bg-(--bg-elevated) hover:border-amber-500/30'
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <FlaskConical
                  size={16}
                  className={mode === 'pbe' ? 'text-amber-400' : 'text-slate-400'}
                />
                <span
                  className={cn(
                    'font-chakra font-semibold',
                    mode === 'pbe' ? 'text-amber-400' : 'text-slate-300'
                  )}
                >
                  PBE
                </span>
                {mode === 'pbe' && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Pre-release — `pbe1` only</p>
            </button>
          </div>

          {mode === 'pbe' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <FlaskConical size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300/80">
                PBE data is pre-release and may be unstable. Region is fixed to{' '}
                <span className="font-mono font-semibold">pbe1</span>.
              </p>
            </div>
          )}
        </div>

        {/* Active regions (official only) */}
        {mode === 'official' && (
          <div
            className={cn(
              'rounded-xl border border-(--border-default) bg-(--bg-surface) p-5 transition-opacity',
              !enabled && 'pointer-events-none opacity-40'
            )}
          >
            <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
              <Globe size={16} className="text-(--accent-primary)" />
              Active Regions
              <span className="ml-auto font-chakra text-xs text-slate-500">
                {regions.length} selected
              </span>
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {ALL_REGIONS.map(({ value, label }) => {
                const checked = regions.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleRegion(value)}
                    className={cn(
                      'rounded-lg border py-2 text-center font-chakra text-xs font-semibold transition-all',
                      checked
                        ? 'border-(--accent-primary)/60 bg-(--accent-primary)/15 text-(--accent-primary)'
                        : 'border-(--border-subtle) bg-(--bg-elevated) text-slate-500 hover:border-(--accent-primary)/30 hover:text-slate-300'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active patch */}
        <div
          className={cn(
            'rounded-xl border border-(--border-default) bg-(--bg-surface) p-5 transition-opacity',
            !enabled && 'pointer-events-none opacity-40'
          )}
        >
          <p className="mb-1 font-medium text-slate-200">Active Patch Filter</p>
          <p className="mb-3 text-xs text-slate-500">
            Only store matches from this patch. Leave blank to collect all patches.
          </p>
          <Input
            value={patch}
            onChange={(e) => setPatch(e.target.value)}
            placeholder="e.g. 15.1 (leave blank for all)"
            allowClear
            className="[&.ant-input-affix-wrapper]:rounded-xl! [&.ant-input-affix-wrapper]:border-(--border-default)! [&.ant-input-affix-wrapper]:bg-(--bg-elevated)! [&_.ant-input]:text-slate-100! [&_.ant-input::placeholder]:text-slate-500!"
          />
        </div>

        {/* Save + last updated */}
        <div className="flex items-center justify-between">
          {settings?.updatedAt && (
            <p className="font-chakra text-xs text-slate-500">
              Last saved:{' '}
              {new Date(settings.updatedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          <button
            onClick={save}
            disabled={isPending}
            className={cn(
              'ml-auto rounded-xl px-6 py-2.5 font-chakra text-sm font-semibold transition-all',
              'bg-(--accent-primary) text-white hover:bg-(--accent-primary)/80',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isPending && 'animate-pulse'
            )}
          >
            {isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {/* Manual crawl actions */}
        <ManualActionsCard />

        {/* Database management */}
        <DbManagementCard />
      </div>
    </div>
  );
}

function ManualActionsCard() {
  const { mutate: collectPlayers, isPending: collectingPlayers } = useCollectPlayers();
  const { mutate: collectMatches, isPending: collectingMatches } = useCollectMatches();
  const { mutate: refreshViews, isPending: refreshingViews } = useRefreshViews();
  const navigate = useNavigate();

  const handleCollectPlayers = () => {
    collectPlayers(undefined, {
      onSuccess: (data) => {
        message.success(
          `Queued ${data.queued} refresh-player-list jobs (${data.regions.join(', ')})`
        );
      },
      onError: (err) => message.error(err.message || 'Failed to enqueue jobs'),
    });
  };

  const handleCollectMatches = () => {
    collectMatches(undefined, {
      onSuccess: (data) => {
        message.success(`Queued ${data.queued} collect-region jobs (${data.regions.join(', ')})`);
        navigate({ to: '/jobs' });
      },
      onError: (err) => message.error(err.message || 'Failed to enqueue jobs'),
    });
  };

  const handleRefreshViews = () => {
    refreshViews(undefined, {
      onSuccess: () => message.success('Queued materialized view refresh job'),
      onError: (err) => message.error(err.message || 'Failed to enqueue job'),
    });
  };

  return (
    <div className="rounded-xl border border-(--accent-primary)/20 bg-(--bg-surface) p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
        <Play size={16} className="text-(--accent-primary)" />
        Manual Actions
      </p>

      <div className="space-y-3">
        {/* Collect Players */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-4">
          <div>
            <p className="mb-0.5 font-medium text-slate-200">Refresh Player List</p>
            <p className="text-xs text-slate-500">
              Enqueue jobs to fetch top players from leaderboard for all active regions.
            </p>
          </div>
          <button
            onClick={handleCollectPlayers}
            disabled={collectingPlayers}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border border-(--accent-primary)/40 bg-(--accent-primary)/10 px-4 py-2',
              'font-chakra text-sm font-semibold text-(--accent-primary) transition-all',
              'hover:border-(--accent-primary)/70 hover:bg-(--accent-primary)/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <RefreshCw size={14} className={cn(collectingPlayers && 'animate-spin')} />
            {collectingPlayers ? 'Queuing…' : 'Refresh'}
          </button>
        </div>

        {/* Collect Matches */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-4">
          <div>
            <p className="mb-0.5 font-medium text-slate-200">Collect Matches</p>
            <p className="text-xs text-slate-500">
              Enqueue jobs to crawl new match data from Riot API. Redirects to Jobs page to track
              progress.
            </p>
          </div>
          <button
            onClick={handleCollectMatches}
            disabled={collectingMatches}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border border-(--accent-primary)/40 bg-[var(--accent-primary)]/10 px-4 py-2',
              'font-chakra text-sm font-semibold text-[var(--accent-primary)] transition-all',
              'hover:border-[var(--accent-primary)]/70 hover:bg-[var(--accent-primary)]/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Play size={14} className={cn(collectingMatches && 'animate-pulse')} />
            {collectingMatches ? 'Queuing…' : 'Crawl Now'}
          </button>
        </div>

        {/* Refresh Materialized Views */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-4">
          <div>
            <p className="mb-0.5 font-medium text-slate-200">Refresh Materialized Views</p>
            <p className="text-xs text-slate-500">
              Rebuild analytics views so the Meta page reflects the latest match data.
            </p>
          </div>
          <button
            onClick={handleRefreshViews}
            disabled={refreshingViews}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border border-(--accent-primary)/40 bg-(--accent-primary)/10 px-4 py-2',
              'font-chakra text-sm font-semibold text-(--accent-primary) transition-all',
              'hover:border-(--accent-primary)/70 hover:bg-(--accent-primary)/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Eye size={14} className={cn(refreshingViews && 'animate-pulse')} />
            {refreshingViews ? 'Queuing…' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DbManagementCard() {
  const { data: stats, isLoading } = useDbStats();
  const { mutate: enqueue, isPending: enqueuing } = useEnqueuePurge();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    enqueue(undefined, {
      onSuccess: () => {
        message.success('Purge job started — tracking in Jobs page');
        setShowConfirm(false);
        navigate({ to: '/jobs' });
      },
      onError: () => {
        message.error('Failed to enqueue purge job');
        setShowConfirm(false);
      },
    });
  };

  const statItems = [
    { icon: Users, label: 'Players', value: stats?.players, color: 'text-[var(--accent-primary)]' },
    { icon: FileText, label: 'Matches', value: stats?.matches, color: 'text-emerald-400' },
    {
      icon: BarChart2,
      label: 'Snapshots',
      value: stats?.metaSnapshots,
      color: 'text-[var(--accent-cyan)]',
    },
    { icon: Database, label: 'Patches', value: stats?.patchVersions, color: 'text-amber-400' },
  ];

  return (
    <div className="rounded-xl border border-rose-500/20 bg-[var(--bg-surface)] p-5">
      <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
        <Database size={16} className="text-rose-400" />
        Database Management
      </p>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statItems.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <Icon size={13} className={color} />
              <span className="text-[11px] text-slate-500">{label}</span>
            </div>
            <p className={cn('font-chakra text-lg font-semibold', color)}>
              {isLoading ? '—' : (value ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Purge action */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
        <div>
          <p className="mb-0.5 font-medium text-rose-300">Purge Set 16 Match Data</p>
          <p className="text-xs text-slate-500">
            Deletes all matches, snapshots and patch history. Players are preserved and reset for
            Set 17.
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={enqueuing}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2',
            'font-chakra text-sm font-semibold text-rose-400 transition-all',
            'hover:border-rose-500/70 hover:bg-rose-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Trash2 size={14} />
          Purge
        </button>
      </div>

      {/* Dark confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !purging && setShowConfirm(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/20 bg-[var(--bg-elevated)] shadow-2xl">
            {/* Top accent bar */}
            <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-rose-600 via-rose-400 to-rose-600" />

            <div className="p-6">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                    <AlertTriangle size={20} className="text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-russo text-base text-slate-100">
                      Purge Set 16 match data?
                    </h3>
                    <p className="text-xs text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>
                <button
                  onClick={() => !purging && setShowConfirm(false)}
                  className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-2 text-sm">
                <p className="text-slate-400">The following will be permanently deleted:</p>
                <ul className="space-y-1.5 text-slate-300">
                  {[
                    'All matches & participant data',
                    'All meta snapshots',
                    'All patch versions & predictions',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-rose-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-300">
                    Players are preserved and stats reset for Set 17.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={enqueuing}
                  className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2.5 font-chakra text-sm font-semibold text-slate-400 transition-all hover:text-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={enqueuing}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5',
                    'bg-rose-500/20 border border-rose-500/40 font-chakra text-sm font-semibold text-rose-300',
                    'transition-all hover:bg-rose-500/30 hover:border-rose-500/60 hover:text-rose-200',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    enqueuing && 'animate-pulse'
                  )}
                >
                  {enqueuing ? <ExternalLink size={14} /> : <Trash2 size={14} />}
                  {enqueuing ? 'Queuing…' : 'Yes, Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
