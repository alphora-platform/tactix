import { createFileRoute } from '@tanstack/react-router';
import { Input, message } from 'antd';
import { Settings, Wifi, WifiOff, FlaskConical, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import { useCrawlSettings, useUpdateCrawlSettings } from '@/hooks/useSettings';

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
        <div className="h-48 animate-pulse rounded-xl bg-[var(--bg-surface)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure the data crawler behaviour." />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* Master toggle */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
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
                'relative flex h-8 w-[136px] shrink-0 items-center rounded-lg border p-0.5 transition-all duration-200',
                enabled
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'
              )}
            >
              {/* Sliding indicator */}
              <span
                className={cn(
                  'absolute h-[26px] w-[64px] rounded-md transition-all duration-200',
                  enabled ? 'left-0.5 bg-emerald-500/25' : 'left-[67px] bg-slate-600/40'
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
            'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-opacity',
            !enabled && 'pointer-events-none opacity-40'
          )}
        >
          <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
            <Settings size={16} className="text-[var(--accent-primary)]" />
            Crawl Mode
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Official */}
            <button
              onClick={() => setMode('official')}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                mode === 'official'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                  : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/40'
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <Globe
                  size={16}
                  className={
                    mode === 'official' ? 'text-[var(--accent-primary)]' : 'text-slate-400'
                  }
                />
                <span
                  className={cn(
                    'font-chakra font-semibold',
                    mode === 'official' ? 'text-[var(--accent-primary)]' : 'text-slate-300'
                  )}
                >
                  Official
                </span>
                {mode === 'official' && (
                  <span className="ml-auto rounded-full bg-[var(--accent-primary)]/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-primary)] uppercase">
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
                  : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-amber-500/30'
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
              'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-opacity',
              !enabled && 'pointer-events-none opacity-40'
            )}
          >
            <p className="mb-4 flex items-center gap-2 font-medium text-slate-200">
              <Globe size={16} className="text-[var(--accent-primary)]" />
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
                        ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-slate-500 hover:border-[var(--accent-primary)]/30 hover:text-slate-300'
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
            'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-opacity',
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
            className="[&.ant-input-affix-wrapper]:!rounded-xl [&.ant-input-affix-wrapper]:!border-[var(--border-default)] [&.ant-input-affix-wrapper]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-500"
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
              'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isPending && 'animate-pulse'
            )}
          >
            {isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
