import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useSignUp } from '@/hooks/useAuth';

export const Route = createFileRoute('/sign-up/')({
  component: SignUpPage,
});

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, error } = useSignUp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ email, username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--bg-base) px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-(--accent-primary) to-(--accent-cyan)"
            style={{ boxShadow: '0 0 24px rgba(139,92,246,0.5)' }}>
            <span className="font-russo text-xl text-white">T</span>
          </div>
          <h1 className="font-russo text-2xl tracking-[0.12em] text-slate-100">TACTIX</h1>
          <p className="mt-1 text-sm text-(--text-muted)">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-(--border-default) bg-(--bg-surface) p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-(--accent-primary)/60 focus:ring-1 focus:ring-(--accent-primary)/30 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={50}
                placeholder="your username"
                className="w-full rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-(--accent-primary)/60 focus:ring-1 focus:ring-(--accent-primary)/30 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-(--accent-primary)/60 focus:ring-1 focus:ring-(--accent-primary)/30 transition-colors"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                {error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-linear-to-r from-(--accent-primary) to-(--accent-cyan) px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-(--text-muted)">
            Already have an account?{' '}
            <Link to="/sign-in" className="text-(--accent-primary) hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-600">
          Not affiliated with Riot Games
        </p>
      </div>
    </div>
  );
}
