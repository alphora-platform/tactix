import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { Globe, Home, TrendingUp, User, Filter, X } from 'lucide-react';
import { PatchSelector } from './PatchSelector';
import { RegionFilter } from './RegionFilter';
import { useChampions, useTraits, useItems, useAugments } from '../../lib/hooks/useMetadata';

const NAV_ITEMS = [
  { to: '/meta', label: 'Meta', icon: Home },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/regions', label: 'Regions', icon: Globe },
  { to: '/stats', label: 'My Stats', icon: User },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  // Preload metadata
  useChampions();
  useTraits();
  useItems();
  useAugments();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex flex-col sm:flex-row h-full bg-bg-primary overflow-hidden">
      {/* ── Desktop/Tablet Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={[
          'hidden sm:flex flex-col bg-bg-card border-r border-border shrink-0 transition-all duration-200',
          'sm:w-16 lg:w-60',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center lg:justify-start lg:gap-3 lg:px-5 border-b border-border flex-shrink-0">
          <span className="hidden lg:inline text-2xl font-bold tracking-widest text-accent-gold">
            TACTIX
          </span>
          <span className="hidden lg:inline text-xs text-text-secondary mt-0.5 font-mono">
            TFT META
          </span>
          <span className="lg:hidden text-2xl font-bold tracking-widest text-accent-gold">T</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 lg:px-3 overflow-y-auto overflow-x-hidden">
          <div className="space-y-2 lg:space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    'flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 lg:px-3 py-2.5 text-sm font-medium',
                    'transition-all duration-150 outline-none relative group',
                    active
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-transparent',
                  ].join(' ')}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="hidden lg:inline whitespace-nowrap">{label}</span>

                  {/* Tooltip on tablet */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-text-primary text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 hidden sm:block lg:hidden whitespace-nowrap z-50">
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-center lg:justify-start">
          <p className="hidden lg:block text-xs text-text-secondary">
            Not affiliated with Riot Games
          </p>
          <span className="lg:hidden text-xs text-text-secondary">©</span>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-card px-4 lg:px-6">
          <span className="font-bold text-accent-gold tracking-widest sm:hidden">TACTIX</span>

          <div className="ml-auto hidden sm:flex items-center gap-3">
            <PatchSelector />
            <RegionFilter />
          </div>

          <div className="ml-auto sm:hidden">
            <button
              onClick={() => setFiltersOpen(true)}
              className="p-2 text-text-secondary hover:text-text-primary bg-bg-elevated rounded-lg"
              aria-label="Open filters"
            >
              <Filter size={18} />
            </button>
          </div>
        </header>

        {/* Page content with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 sm:pb-6 animate-fade-in">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card border-t border-border flex items-center justify-around h-[68px] pb-safe px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={[
                  'flex flex-col items-center justify-center flex-1 h-full gap-1',
                  active ? 'text-accent-gold' : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                <Icon size={20} className={active ? 'scale-110 transition-transform' : ''} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Mobile Filters Bottom Sheet ────────────────────────────────────────── */}
      {filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 sm:hidden transition-opacity"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border rounded-t-2xl p-5 sm:hidden slide-up-animation">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-text-primary">Filters</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5 pb-safe">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
