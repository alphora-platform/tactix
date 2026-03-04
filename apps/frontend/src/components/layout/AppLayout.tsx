import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { PatchSelector } from './PatchSelector';
import { RegionFilter } from './RegionFilter';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../lib/utils/cn';
import { useChampions, useTraits, useItems, useAugments } from '../../lib/hooks/useMetadata';

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/meta', label: 'Meta', icon: Home },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/regions', label: 'Regions', icon: Globe },
  { to: '/stats', label: 'My Stats', icon: User },
] as const;

// ── Breadcrumb map ─────────────────────────────────────────────────────────────

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

// ── Sidebar state — persisted to localStorage ─────────────────────────────────

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

// ── AppLayout ──────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  // Preload metadata
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

  // Close mobile filters sheet when route changes
  useEffect(() => {
    setFiltersOpen(false);
  }, [location]);

  return (
    <div className="flex flex-col sm:flex-row h-full bg-bg-primary overflow-hidden">
      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden sm:flex flex-col bg-bg-card border-r border-border shrink-0',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center border-b border-border flex-shrink-0 px-3 gap-2">
          {/* Logo — visible when expanded */}
          <div
            className={cn(
              'flex items-center gap-2 flex-1 min-w-0 overflow-hidden transition-all duration-300',
              sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            )}
          >
            <span className="text-xl font-black tracking-widest text-accent-gold whitespace-nowrap">
              TACTIX
            </span>
            <span className="text-[10px] text-text-secondary font-mono whitespace-nowrap mt-0.5">
              TFT META
            </span>
          </div>

          {/* Collapsed: show "T" monogram */}
          {!sidebarOpen && (
            <span className="text-xl font-black text-accent-gold w-full text-center select-none">
              T
            </span>
          )}

          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex items-center justify-center rounded-lg p-1.5 shrink-0',
              'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
              'transition-colors duration-150',
              !sidebarOpen && 'absolute left-3' // keep toggle accessible when collapsed
            )}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={!sidebarOpen ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    'transition-all duration-150 outline-none relative group',
                    sidebarOpen ? 'justify-start' : 'justify-center',
                    active
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-transparent'
                  )}
                >
                  <Icon size={20} className="shrink-0" />

                  {/* Label — slides in/out with sidebar */}
                  <span
                    className={cn(
                      'whitespace-nowrap overflow-hidden transition-all duration-300',
                      sidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
                    )}
                  >
                    {label}
                  </span>

                  {/* Tooltip when collapsed */}
                  {!sidebarOpen && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-bg-elevated border border-border text-text-primary text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 shadow-card transition-opacity duration-150">
                      {label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom user / disclaimer */}
        <div
          className={cn(
            'border-t border-border flex items-center gap-3 px-3 py-3 overflow-hidden',
            sidebarOpen ? 'justify-start' : 'justify-center'
          )}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-accent-gold/20 border border-accent-gold/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-accent-gold select-none">TFT</span>
          </div>

          {/* Name + sub — hidden when collapsed */}
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 min-w-0',
              sidebarOpen ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
            )}
          >
            <p className="text-xs font-semibold text-text-primary whitespace-nowrap">Tactix</p>
            <p className="text-[10px] text-text-secondary whitespace-nowrap">
              Not affiliated with Riot
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        {/* Topbar (header) */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-card px-4">
          {/* Left: hamburger (desktop) + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop sidebar toggle (hamburger) */}
            <button
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="hidden sm:flex items-center justify-center rounded-lg p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors duration-150 shrink-0"
            >
              <Menu size={18} />
            </button>

            {/* Mobile: TACTIX wordmark */}
            <span className="sm:hidden font-black text-lg text-accent-gold tracking-widest">
              TACTIX
            </span>

            {/* Breadcrumb — desktop only */}
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-text-secondary text-xs select-none">/</span>
              <span className="text-sm font-semibold text-text-primary truncate">{breadcrumb}</span>
            </div>
          </div>

          {/* Right: desktop controls */}
          <div className="hidden sm:flex items-center gap-2.5">
            <PatchSelector />
            <RegionFilter />

            {/* Divider */}
            <div className="w-px h-5 bg-border shrink-0" />

            <ThemeToggle />

            {/* Divider */}
            <div className="w-px h-5 bg-border shrink-0" />

            {/* Notification placeholder */}
            <button
              aria-label="Notifications"
              className="flex items-center justify-center rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors duration-150 relative"
            >
              <Bell size={17} />
              {/* Notification dot */}
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent-gold rounded-full" />
            </button>
          </div>

          {/* Mobile: filter button — 44×44 touch target */}
          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="p-3 text-text-secondary hover:text-text-primary bg-bg-elevated rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open filters"
            >
              <Filter size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 sm:pb-6 animate-fade-in">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card border-t border-border flex items-center justify-around h-[60px] px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 py-2',
                  active ? 'text-accent-gold' : 'text-text-secondary hover:text-text-primary'
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

      {/* ── Mobile Filters Bottom Sheet ────────────────────────────────────────── */}
      {filtersOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 sm:hidden"
            onClick={() => setFiltersOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border rounded-t-2xl p-5 sm:hidden animate-slide-up">
            {/* Sheet header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-text-primary">Filters & Settings</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-text-secondary hover:text-text-primary p-2.5 rounded-md hover:bg-bg-elevated transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 pb-safe">
              {/* Patch */}
              <div>
                <label className="text-xs text-text-secondary font-semibold uppercase mb-2 block tracking-wider">
                  Game Patch
                </label>
                <div
                  className="w-full"
                  onClick={() => setTimeout(() => setFiltersOpen(false), 200)}
                >
                  <PatchSelector />
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs text-text-secondary font-semibold uppercase mb-2 block tracking-wider">
                  Region
                </label>
                <div
                  className="w-full"
                  onClick={() => setTimeout(() => setFiltersOpen(false), 200)}
                >
                  <RegionFilter />
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="text-xs text-text-secondary font-semibold uppercase mb-2 block tracking-wider">
                  Theme
                </label>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
