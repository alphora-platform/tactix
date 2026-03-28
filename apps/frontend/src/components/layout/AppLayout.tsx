import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button } from 'antd';
import {
  Globe,
  Home,
  TrendingUp,
  User,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Search,
  Users,
  Trophy,
  FlaskConical,
  LogOut,
  ScrollText,
  Settings,
  ListChecks,
} from 'lucide-react';
import { PatchSelector } from './PatchSelector';
import { RegionFilter } from './RegionFilter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../lib/utils/cn';
import { useChampions, useTraits, useItems, useAugments } from '../../lib/hooks/useMetadata';
import { useAuthStore } from '../../lib/store/auth.store';
import { useSignOut } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/meta', label: 'Meta', icon: Home },
  { to: '/playbook', label: 'Playbook', icon: Trophy },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/regions', label: 'Regions', icon: Globe },
  { to: '/stats', label: 'My Stats', icon: User },
  { to: '/pbe', label: 'PBE', icon: FlaskConical },
  { to: '/player', label: 'Player', icon: Users },
  { to: '/match', label: 'Match', icon: Search },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/jobs', label: 'Jobs', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Subset shown in the mobile bottom nav bar (max 5 for comfortable tap targets) */
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(({ to }) =>
  ['/meta', '/playbook', '/trends', '/stats', '/regions'].includes(to)
);

const BREADCRUMB_MAP: Record<string, string> = {
  '/meta': 'Meta Overview',
  '/playbook': 'Day-1 Playbook',
  '/trends': 'Trends',
  '/regions': 'Regional Analysis',
  '/stats': 'My Stats',
  '/pbe': 'PBE Preview',
  '/logs': 'Logs',
  '/jobs': 'Background Jobs',
  '/settings': 'Settings',
};

function getBreadcrumb(pathname: string): string {
  for (const [prefix, label] of Object.entries(BREADCRUMB_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return label;
  }
  return 'Dashboard';
}

const SIDEBAR_KEY = 'tactix-sidebar-open';

function getSidebarOpen(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function setSidebarOpen(val: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(val));
  } catch {
    // ignore
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  useChampions();
  useTraits();
  useItems();
  useAugments();

  const user = useAuthStore((s) => s.user);
  const { mutate: signOut, isPending: signingOut } = useSignOut();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sidebarOpen, _setSidebarOpen] = useState<boolean>(getSidebarOpen);
  const location = useRouterState({ select: (s) => s.location.pathname });
  const breadcrumb = getBreadcrumb(location);

  const toggleSidebar = () => {
    _setSidebarOpen((prev) => {
      const next = !prev;
      setSidebarOpen(next);
      return next;
    });
  };

  useEffect(() => {
    setFiltersOpen(false);
  }, [location]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-(--bg-base) sm:flex-row">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-(--border-default) sm:flex',
          'overflow-hidden transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
        style={{
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, #040a1a 100%)',
        }}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-(--border-default) px-3">
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center gap-3 overflow-hidden transition-all duration-300',
              sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
            )}
          >
            {/* Logo orb */}
            <div className="relative shrink-0">
              <span
                className="block h-7 w-7 rounded-lg bg-linear-to-br from-(--accent-primary) to-(--accent-cyan)"
                style={{
                  boxShadow: '0 0 0 2px rgba(139,92,246,0.2), 0 0 16px rgba(139,92,246,0.5)',
                  animation: 'cosmos-pulse 2.5s ease-in-out infinite',
                }}
              >
                <span className="flex h-full w-full items-center justify-center font-russo text-xs font-normal text-white">
                  T
                </span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-russo text-lg font-normal leading-none tracking-[0.14em] text-slate-100">
                TACTIX
              </p>
              <span className="mt-0.5 inline-flex items-center rounded-sm bg-(--accent-primary)/10 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.18em] text-(--accent-primary) uppercase">
                SET 17: COSMOS
              </span>
            </div>
          </div>

          {!sidebarOpen && (
            <div className="flex w-full items-center justify-center">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-(--accent-primary) to-(--accent-cyan) font-russo text-xs text-white"
                style={{ boxShadow: '0 0 10px rgba(139,92,246,0.5)' }}
              >
                T
              </span>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors duration-150',
              'hover:bg-white/5 hover:text-slate-200',
              !sidebarOpen && 'absolute left-3'
            )}
          >
            {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-4">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={!sidebarOpen ? label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-150',
                    sidebarOpen ? 'justify-start' : 'justify-center',
                    active ? 'text-white' : 'text-slate-500 hover:bg-white/4 hover:text-slate-300'
                  )}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(90deg, rgba(139,92,246,0.22) 0%, rgba(6,182,212,0.06) 100%)',
                          boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.2)',
                        }
                      : undefined
                  }
                >
                  {/* Active left accent */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full bg-(--accent-primary)"
                      style={{ boxShadow: '0 0 8px rgba(139,92,246,0.7)' }}
                    />
                  )}

                  <Icon
                    size={18}
                    className={cn('shrink-0', active ? 'text-(--accent-primary)' : '')}
                  />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap transition-all duration-300',
                      sidebarOpen ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'
                    )}
                  >
                    {label}
                  </span>

                  {!sidebarOpen && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium text-slate-200 opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100">
                      {label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Live badge */}
        <div className="mx-2 mb-2">
          <div
            className={cn(
              'rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3',
              sidebarOpen ? 'py-2.5' : 'flex items-center justify-center py-3'
            )}
          >
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  style={{ animation: 'live-blink 1.5s ease-in-out infinite' }}
                />
                <span className="font-chakra text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Live Data
                </span>
              </div>
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                style={{ animation: 'live-blink 1.5s ease-in-out infinite' }}
              />
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className={cn(
            'mx-2 mb-3 rounded-lg border border-(--border-subtle) bg-(--bg-elevated)/30 px-3',
            sidebarOpen ? 'py-2' : 'flex items-center justify-center py-3'
          )}
        >
          {sidebarOpen ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Tactix
              </p>
              <p className="text-[10px] text-(--text-muted)">Not affiliated with Riot</p>
            </>
          ) : (
            <span className="font-russo text-[10px] text-slate-500">Tx</span>
          )}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-(--border-default) bg-(--bg-surface)/80 px-6 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="hidden shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-slate-200 sm:flex"
            >
              <Menu size={18} />
            </button>

            <span className="font-russo text-base font-normal tracking-[0.14em] text-slate-100 sm:hidden">
              TACTIX
            </span>

            <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
              <span className="select-none text-xs text-slate-600">/</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="font-chakra truncate text-sm font-medium tracking-wide text-slate-200">
                {breadcrumb}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2.5 sm:flex">
            <PatchSelector />
            <RegionFilter />
            <ThemeToggle />

            <Badge dot color="var(--accent-primary)" offset={[-2, 3]}>
              <Button
                aria-label="Notifications"
                ghost
                shape="circle"
                icon={<Bell size={16} />}
                className="border-(--border-default)! text-slate-300! hover:border-(--accent-primary)/60! hover:bg-white/5! hover:text-slate-100!"
              />
            </Badge>

            {user && (
              <div className="flex items-center gap-2 rounded-lg border border-(--border-default) bg-(--bg-elevated) px-3 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-(--accent-primary) to-(--accent-cyan) text-[10px] font-bold text-white">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="font-chakra text-xs font-medium text-slate-300">
                  {user.username}
                </span>
                <button
                  onClick={() => signOut()}
                  disabled={signingOut}
                  aria-label="Sign out"
                  className="ml-1 text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-(--bg-elevated) p-3 text-slate-400 transition-colors hover:text-slate-200"
              aria-label="Open filters"
            >
              <Filter size={18} />
            </button>
          </div>
        </header>

        <main className="animate-fade-in flex-1 overflow-y-auto bg-(--bg-base) px-5 py-7 pb-24 sm:px-6 sm:py-8 sm:pb-8">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-15 items-center justify-around border-t border-(--border-default) bg-(--bg-surface)/90 px-2 backdrop-blur-md sm:hidden">
          {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-150',
                  active ? 'text-(--accent-primary)' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {active && (
                  <span
                    className="absolute top-1 h-0.5 w-5 rounded-full bg-(--accent-primary)"
                    style={{ boxShadow: '0 0 6px rgba(139,92,246,0.8)' }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-wide leading-none',
                    active ? 'opacity-100' : 'opacity-70'
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 sm:hidden"
            onClick={() => setFiltersOpen(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-(--border-default) bg-(--bg-surface) p-5 animate-slide-up sm:hidden">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Filters & Settings</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 pb-safe">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Game Patch
                </label>
                <PatchSelector className="w-full" onValueChange={() => setFiltersOpen(false)} />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Region
                </label>
                <RegionFilter className="w-full" onValueChange={() => setFiltersOpen(false)} />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Theme
                </label>
                <ThemeToggle className="w-full" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
