import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Clock, Loader2, XCircle, AlertTriangle, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import { useJobsList } from '@/hooks/useJobs';
import type { JobSummary } from '@/hooks/useJobs';

export const Route = createFileRoute('/jobs/')({
  component: JobsPage,
});

/* ------------------------------------------------------------------ */
/*  Config                                                              */
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
} satisfies Record<
  JobSummary['status'],
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
    bar: string;
    spin: boolean;
  }
>;

const JOB_LABELS: Record<string, string> = {
  'purge-match-data': 'Purge Match Data',
};

/* ------------------------------------------------------------------ */
/*  Formatters                                                          */
/* ------------------------------------------------------------------ */

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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: JobSummary['status'] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        cfg.bg,
        cfg.color
      )}
    >
      <Icon size={11} className={cfg.spin ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ job }: { job: JobSummary }) {
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.unknown;
  const pct = job.status === 'completed' ? 100 : job.progress;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
          className={cn('h-full rounded-full transition-all duration-300', cfg.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-chakra text-[11px] text-slate-500 tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

function ResultCell({ job }: { job: JobSummary }) {
  if (job.status === 'failed' && job.error) {
    return (
      <span
        className="font-mono text-[11px] text-rose-400 line-clamp-1 max-w-[220px]"
        title={job.error}
      >
        {job.error}
      </span>
    );
  }
  if (job.status === 'completed' && job.result) {
    const entries = Object.entries(job.result as Record<string, number>);
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map(([k, v]) => (
          <span key={k} className="font-chakra text-[11px] text-slate-400 whitespace-nowrap">
            <span className="text-slate-600">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
            <span className="text-emerald-300 font-semibold">{Number(v).toLocaleString()}</span>
          </span>
        ))}
      </div>
    );
  }
  return <span className="text-slate-700">—</span>;
}

/* ------------------------------------------------------------------ */
/*  Table columns header                                                */
/* ------------------------------------------------------------------ */

const COLUMNS = [
  { key: 'job', label: 'Job', width: 'w-[200px]' },
  { key: 'status', label: 'Status', width: 'w-[120px]' },
  { key: 'progress', label: 'Progress', width: 'w-[160px]' },
  { key: 'enqueued', label: 'Enqueued', width: 'w-[160px]' },
  { key: 'started', label: 'Started', width: 'w-[160px]' },
  { key: 'duration', label: 'Duration', width: 'w-[100px]' },
  { key: 'result', label: 'Result / Error', width: '' },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

function JobsPage() {
  const { data: jobs = [], isLoading, connected } = useJobsList();

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
                <span
                  className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                  style={{ animation: 'live-blink 1.5s ease-in-out infinite' }}
                />
                {activeCount} running
              </span>
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 font-chakra text-xs font-semibold',
                connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-500/30 bg-slate-500/10 text-slate-500'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  connected ? 'bg-emerald-400' : 'bg-slate-500'
                )}
                style={
                  connected ? { animation: 'live-blink 1.5s ease-in-out infinite' } : undefined
                }
              />
              {connected ? 'Live' : 'Connecting…'}
            </div>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Table header */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-chakra text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap',
                      col.width
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-default)]/50">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <div
                          className="h-3 animate-pulse rounded-full bg-[var(--bg-elevated)]"
                          style={{ width: `${50 + ((i * 13 + COLUMNS.indexOf(col) * 17) % 35)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && jobs.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <ListChecks size={32} className="text-slate-600" strokeWidth={1.5} />
                      <p className="font-russo text-sm text-slate-500">No jobs yet</p>
                      <p className="text-xs text-slate-600">
                        Background jobs triggered from Settings will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.unknown;
                return (
                  <tr
                    key={job.id}
                    className={cn(
                      'group transition-colors hover:bg-[var(--bg-elevated)]/40',
                      job.status === 'active' && 'bg-cyan-400/[0.03]'
                    )}
                  >
                    {/* Job */}
                    <td className="px-4 py-3.5">
                      <p className="font-russo text-sm text-slate-100">
                        {JOB_LABELS[job.name] ?? job.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">{job.id}</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={job.status} />
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3.5">
                      <ProgressBar job={job} />
                    </td>

                    {/* Enqueued */}
                    <td className="px-4 py-3.5">
                      <span className="font-chakra text-xs text-slate-400">
                        {formatTime(job.enqueuedAt)}
                      </span>
                    </td>

                    {/* Started */}
                    <td className="px-4 py-3.5">
                      <span className="font-chakra text-xs text-slate-400">
                        {formatTime(job.startedAt)}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'font-chakra text-xs tabular-nums',
                          job.status === 'active' ? cfg.color : 'text-slate-400'
                        )}
                      >
                        {formatDuration(job.startedAt, job.finishedAt)}
                      </span>
                    </td>

                    {/* Result / Error */}
                    <td className="px-4 py-3.5">
                      <ResultCell job={job} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && jobs.length > 0 && (
          <div className="border-t border-[var(--border-default)]/50 px-4 py-2.5">
            <p className="font-chakra text-[11px] text-slate-600">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} &mdash;{' '}
              {jobs.filter((j) => j.status === 'completed').length} completed,{' '}
              {jobs.filter((j) => j.status === 'failed').length} failed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
