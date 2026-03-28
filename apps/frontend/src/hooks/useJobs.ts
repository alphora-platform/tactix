import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface JobSummary {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: unknown;
  error: string | null;
}

export interface EnqueueResponse {
  jobId: string;
  name: string;
  enqueuedAt: string;
}

const JOBS_KEY = ['jobs'];
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/** Merges an updated job into the jobs list (replaces by id, or prepends if new). */
function mergeJob(prev: JobSummary[], updated: JobSummary): JobSummary[] {
  const idx = prev.findIndex((j) => j.id === updated.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = updated;
    return next;
  }
  return [updated, ...prev];
}

/**
 * Loads the jobs list once on mount, then keeps it live via SSE.
 * Returns a `connected` boolean for the SSE connection status.
 */
export function useJobsList() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  const query = useQuery<JobSummary[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get('/jobs');
      return data;
    },
    staleTime: Infinity, // SSE keeps data fresh — no background refetch needed
  });

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/jobs/stream`, { withCredentials: true });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('message', (event) => {
      try {
        const updated: JobSummary = JSON.parse(event.data);
        queryClient.setQueryData<JobSummary[]>(JOBS_KEY, (prev = []) => mergeJob(prev, updated));
      } catch {
        // ignore malformed events
      }
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, [queryClient]);

  return { ...query, connected };
}

export function useEnqueuePurge() {
  const queryClient = useQueryClient();
  return useMutation<EnqueueResponse>({
    mutationFn: async () => {
      const { data } = await apiClient.post('/jobs/purge-match-data');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}
