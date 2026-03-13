import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings.store';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return JSON.parse(atob(padded));
}

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const setAuthToken = useSettingsStore((s) => s.setAuthToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash;
      // Expected format: #token=<jwt>
      const token = hash
        .substring(1)
        .split('&')
        .map((p) => p.split('='))
        .find(([k]) => k === 'token')?.[1];

      if (!token) {
        setError('No authentication token found in the URL.');
        return;
      }

      // Decode JWT payload (base64url-safe, no verification needed client-side)
      const payload = decodeJwtPayload(token);
      const { puuid, gameName, tagLine } = payload as {
        puuid: string;
        gameName: string;
        tagLine: string;
      };

      if (!puuid || !gameName || !tagLine) {
        setError('Invalid token payload — missing account information.');
        return;
      }

      setAuthToken(token, puuid, gameName, tagLine);
      navigate({ to: '/stats' });
    } catch {
      setError('Failed to process authentication token.');
    }
  }, [navigate, setAuthToken]);

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
            <AlertTriangle size={22} className="text-rose-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-100">
            Authentication Failed
          </h2>
          <p className="mb-5 text-sm text-slate-400">{error}</p>
          <a
            href="/stats"
            className="inline-block rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            Back to My Stats
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
        <p className="text-sm text-slate-400">Signing you in...</p>
      </div>
    </div>
  );
}
