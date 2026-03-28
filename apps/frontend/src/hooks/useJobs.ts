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

export function useJobsList() {
  const jobs = useQuery<JobSummary[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get('/jobs');
      return data;
    },
    refetchInterval: (query) => {
      const jobs = query.state.data ?? [];
      const hasActive = jobs.some((j) => j.status === 'active' || j.status === 'waiting');
      return hasActive ? 1500 : 5000;
    },
  });
  return jobs;
}

export function useJob(id: string) {
  return useQuery<JobSummary>({
    queryKey: [...JOBS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/jobs/${id}`);
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'active' || status === 'waiting' ? 1000 : false;
    },
    enabled: !!id,
  });
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
