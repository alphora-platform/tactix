import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Select } from 'antd';
import { Trash2, Pause, Play, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils/cn';
import { apiClient } from '@/lib/api/client';

export const Route = createFileRoute('/logs/')({
  component: LogsPage,
});

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'LOG' | 'WARN' | 'ERROR' | 'VERBOSE';
  context: string;
  message: string;
}

type LogLevel = 'ALL' | 'DEBUG' | 'LOG' | 'WARN' | 'ERROR';

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  DEBUG: 'text-slate-400',
  LOG: 'text-emerald-400',
  WARN: 'text-amber-400',
  ERROR: 'text-rose-400',
  VERBOSE: 'text-violet-400',
};

const LEVEL_BG: Record<LogEntry['level'], string> = {
  DEBUG: 'bg-slate-400/10',
  LOG: 'bg-emerald-400/10',
  WARN: 'bg-amber-400/10',
  ERROR: 'bg-rose-400/10',
  VERBOSE: 'bg-violet-400/10',
};

const MAX_ENTRIES = 500;

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

let idCounter = 0;

function ensureId(entry: Omit<LogEntry, 'id'> & { id?: string }): LogEntry {
  return { ...entry, id: entry.id ?? `log-${idCounter++}` } as LogEntry;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel>('ALL');
  const [contextSearch, setContextSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Append logs helper (caps at MAX_ENTRIES)
  const appendLogs = useCallback((incoming: LogEntry[]) => {
    setLogs((prev) => {
      const combined = [...prev, ...incoming];
      return combined.length > MAX_ENTRIES
        ? combined.slice(combined.length - MAX_ENTRIES)
        : combined;
    });
  }, []);

  // SSE connection
  useEffect(() => {
    // Fetch recent logs first
    apiClient
      .get<LogEntry[]>('/logs/recent', { params: { limit: 200 } })
      .then((res) => {
        const entries = (res.data ?? []).map(ensureId);
        setLogs(entries.slice(-MAX_ENTRIES));
      })
      .catch(() => {
        // silently ignore — backend might not be ready
      });

    // Open SSE stream
    const es = new EventSource(`${API_BASE}/logs/stream`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener('log', (event) => {
      try {
        const entry = ensureId(JSON.parse(event.data));
        appendLogs([entry]);
      } catch {
        // ignore malformed events
      }
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [appendLogs]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filtered = logs.filter((log) => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (contextSearch && !log.context.toLowerCase().includes(contextSearch.toLowerCase()))
      return false;
    return true;
  });

  const handleClear = () => setLogs([]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Logs"
        subtitle="Real-time application log stream"
        actions={
          <div className="flex items-center gap-2">
            {/* Connection status badge */}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  connected ? 'bg-emerald-400' : 'bg-rose-400'
                )}
                style={
                  connected ? { animation: 'live-blink 1.5s ease-in-out infinite' } : undefined
                }
              />
              {connected ? 'Live' : 'Disconnected'}
            </div>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={levelFilter}
          onChange={(val) => setLevelFilter(val)}
          className="w-32"
          popupClassName="!bg-(--bg-elevated)"
          options={[
            { value: 'ALL', label: 'All Levels' },
            { value: 'DEBUG', label: 'DEBUG' },
            { value: 'LOG', label: 'LOG' },
            { value: 'WARN', label: 'WARN' },
            { value: 'ERROR', label: 'ERROR' },
          ]}
        />

        <Input
          placeholder="Filter by context..."
          prefix={<Search size={14} className="text-slate-500" />}
          value={contextSearch}
          onChange={(e) => setContextSearch(e.target.value)}
          className="w-56"
          allowClear
        />

        <div className="flex-1" />

        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            autoScroll
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          )}
        >
          {autoScroll ? <Play size={12} /> : <Pause size={12} />}
          {autoScroll ? 'Auto-scroll' : 'Paused'}
        </button>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* Log display */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-(--border-default) bg-[#030714] p-3 font-mono text-xs leading-relaxed"
        style={{ minHeight: 300 }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-600">
            {logs.length === 0 ? 'Waiting for logs...' : 'No logs match the current filters'}
          </div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="flex gap-2 py-0.5 hover:bg-white/[0.02]">
              <span className="shrink-0 text-slate-600">[{formatTime(log.timestamp)}]</span>
              <span
                className={cn(
                  'shrink-0 rounded px-1 font-semibold',
                  LEVEL_COLORS[log.level],
                  LEVEL_BG[log.level]
                )}
              >
                {log.level.padEnd(7)}
              </span>
              <span className="shrink-0 text-cyan-400/70">[{log.context}]</span>
              <span className="min-w-0 break-all text-slate-300">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <span>
          {filtered.length} / {logs.length} entries
          {logs.length >= MAX_ENTRIES && ' (oldest entries dropped)'}
        </span>
        <span className="font-chakra tabular-nums">
          Buffer: {logs.length} / {MAX_ENTRIES}
        </span>
      </div>
    </div>
  );
}
