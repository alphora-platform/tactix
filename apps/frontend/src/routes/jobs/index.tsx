import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Clock, Loader2, XCircle, AlertTriangle, ListChecks, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import { useJobsList } from '@/hooks/useJobs';
import type { JobSummary } from '@/hooks/useJobs';

export const Route = createFileRoute('/jobs/')({
  component: JobsPage,
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  active: {
    label: 'Running',
    icon: Loader2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
    bar: 'bg-cyan-400',
    spin: true,
  },
  waiting: {
    label: 'Queued',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
    bar: 'bg-amber-400',
    spin: false,
  },
  delayed: {
    label: 'Delayed',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
    bar: 'bg-amber-400',
    spin: false,
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    bar: 'bg-emerald-400',
    spin: false,
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 border-rose-400/20',
    bar: 'bg-rose-400',
    spin: false,
  },
  unknown: {
    label: 'Unknown',
    icon: AlertTriangle,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10 border-slate-400/20',
    bar: 'bg-slate-400',
    spin: false,
  },
} satisfies Record<JobSummary['status'], { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string; bar: string; spin: boolean }>;

const JOB_LABELS: Record<string, string> = {
  'purge-match-data': 'Purge Match Data',
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '—';
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  JobCard                                                             */
/* ------------------------------------------------------------------ */

function JobCard({ job }: { job: JobSummary }) {
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  const label = JOB_LABELS[job.name] ?? job.name;

  const result = job.result as Record<string, number> | null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      {/* Top accent line based on status */}
      <div className={cn('h-[3px]', cfg.bar)} />

      <div className="p-5">
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-russo text-sm text-slate-100">{label}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-600">id: {job.id}</p>
          </div>
          <span className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', cfg.bg, cfg.color)}>
            <Icon size={12} className={cfg.spin ? 'animate-spin' : ''} />
            {cfg.label}
          </span>
        </div>

        {/* Progress bar (always shown, full when complete) */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between font-chakra text-[11px] text-slate-500">
            <span>Progress</span>
            <span>{job.status === 'completed' ? 100 : job.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className={cn('h-full rounded-full transition-all duration-300', cfg.bar)}
              style={{ width: `${job.status === 'completed' ? 100 : job.progress}%` }}
            />
          </div>
        </div>

        {/* Timestamps */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Enqueued', value: formatTime(job.enqueuedAt) },
            { label: 'Started', value: formatTime(job.startedAt) },
            { label: 'Duration', value: formatDuration(job.startedAt, job.finishedAt) },
          ].map(({ label: l, value }) => (
            <div key={l}>
              <p className="font-chakra text-[10px] uppercase tracking-widest text-slate-600">{l}</p>
              <p className="font-chakra text-xs text-slate-400">{value}</p>
            </div>
          ))}
        </div>

        {/* Result */}
        {job.status === 'completed' && result && (
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
            <p className="mb-2 font-chakra text-[10px] uppercase tracking-widest text-emerald-600">Result</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-chakra text-xs text-slate-300">
              {Object.entries(result).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                  <span className="font-semibold text-emerald-300">{Number(v).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {job.status === 'failed' && job.error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="mb-1 font-chakra text-[10px] uppercase tracking-widest text-rose-600">Error</p>
            <p className="font-mono text-xs text-rose-300 break-all">{job.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

function JobsPage() {
  const { data: jobs = [], isLoading, refetch, isFetching } = useJobsList();

  const activeCount = jobs.filter((j) => j.status === 'active' || j.status === 'waiting').length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Background Jobs"
        subtitle="Track running and recent system jobs"
        actions={
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-chakra text-xs font-semibold text-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animation: 'live-blink 1.5s ease-in-out infinite' }} />
                {activeCount} running
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-[var(--bg-surface)]" />
          ))}
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-16 text-center">
          <ListChecks size={32} className="mb-3 text-slate-600" />
          <p className="font-russo text-sm text-slate-500">No jobs yet</p>
          <p className="mt-1 text-xs text-slate-600">Background jobs triggered from Settings will appear here.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
