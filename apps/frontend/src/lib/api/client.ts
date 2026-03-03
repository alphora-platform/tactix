import axios, { type AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Unwrap nested data automatically
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const message =
      (err.response?.data as { message?: string })?.message ?? err.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  }
);
