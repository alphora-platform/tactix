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
} from 'lucide-react';
import { PatchSelector } from './PatchSelector';
import { RegionFilter } from './RegionFilter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../lib/utils/cn';
import { useChampions, useTraits, useItems, useAugments } from '../../lib/hooks/useMetadata';

const NAV_ITEMS = [
  { to: '/meta', label: 'Meta', icon: Home },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/regions', label: 'Regions', icon: Globe },
  { to: '/stats', label: 'My Stats', icon: User },
  { to: '/player', label: 'Player', icon: Users },
  { to: '/match', label: 'Match', icon: Search },
] as const;

const BREADCRUMB_MAP: Record<string, string> = {
  '/meta': 'Meta Overview',
  '/trends': 'Trends',
  '/regions': 'Regional Analysis',
  '/stats': 'My Stats',
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
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)] sm:flex-row">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] sm:flex',
          'overflow-hidden transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-2 border-b border-[var(--border-default)] px-3">
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center gap-3 overflow-hidden transition-all duration-300',
              sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" />
            <div className="min-w-0">
              <p className="font-['Rajdhani'] text-xl font-bold leading-none tracking-[0.18em] text-slate-100">
                TACTIX
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-blue-400">
                TFT META
              </p>
            </div>
          </div>

          {!sidebarOpen && (
            <div className="flex w-full items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
            </div>
          )}

          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors duration-150',
              'hover:bg-white/5 hover:text-slate-200',
              !sidebarOpen && 'absolute left-3'
            )}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={!sidebarOpen ? label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium outline-none transition-colors duration-150',
                    sidebarOpen ? 'justify-start rounded-r-lg' : 'justify-center rounded-lg',
                    active
                      ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                >
                  <Icon size={19} className="shrink-0" />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap transition-all duration-300',
                      sidebarOpen ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'
                    )}
                  >
                    {label}
                  </span>

                  {!sidebarOpen && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-slate-200 opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100">
                      {label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div
          className={cn(
            'mx-2 mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3',
            sidebarOpen ? 'py-2' : 'flex items-center justify-center py-3'
          )}
        >
          {sidebarOpen ? (
            <>
              <p className="text-[11px] font-semibold text-slate-300">Tactix</p>
              <p className="text-[10px] text-[var(--text-muted)]">Not affiliated with Riot</p>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">Tx</span>
          )}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="hidden shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-slate-200 sm:flex"
            >
              <Menu size={18} />
            </button>

            <span className="font-['Rajdhani'] text-lg font-bold tracking-[0.15em] text-slate-100 sm:hidden">
              TACTIX
            </span>

            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="select-none text-xs text-slate-500">/</span>
              <span className="truncate text-sm font-semibold text-slate-100">{breadcrumb}</span>
            </div>
          </div>

          <div className="hidden items-center gap-2.5 sm:flex">
            <PatchSelector />
            <RegionFilter />
            <ThemeToggle />

            <Badge dot color="#3B82F6" offset={[-2, 3]}>
              <Button
                aria-label="Notifications"
                ghost
                shape="circle"
                icon={<Bell size={16} />}
                className="!border-[var(--border-default)] !text-slate-300 hover:!border-blue-500/60 hover:!bg-white/5 hover:!text-slate-100"
              />
            </Badge>
          </div>

          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[var(--bg-elevated)] p-3 text-slate-400 transition-colors hover:text-slate-200"
              aria-label="Open filters"
            >
              <Filter size={18} />
            </button>
          </div>
        </header>

        <main className="animate-fade-in flex-1 overflow-y-auto bg-[var(--bg-base)] px-6 py-8 pb-24 sm:pb-8">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[60px] items-center justify-around border-t border-[var(--border-default)] bg-[var(--bg-surface)] px-2 sm:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2',
                  active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon
                  size={22}
                  className={active ? 'scale-110 transition-transform duration-150' : ''}
                />
                <span className="text-[10px] font-medium leading-none">{label}</span>
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

          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-[var(--border-default)] bg-[var(--bg-surface)] p-5 animate-slide-up sm:hidden">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Filters & Settings</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
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
