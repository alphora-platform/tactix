import { ChevronDown, Check, Loader2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store/settings.store';
import { fetchPatches } from '@/lib/api/analytics.api';

export function PatchSelector() {
  const { selectedPatch, setSelectedPatch } = useSettingsStore();

  const { data, isLoading } = useQuery({
    queryKey: ['patches'],
    queryFn: fetchPatches,
    staleTime: 10 * 60 * 1000, // 10 minutes — patches don't change often
  });

  const label = selectedPatch || 'Latest';
  const patches = data?.patches ?? [];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary hover:border-accent-gold/50 transition-colors outline-none">
          <span className="text-text-secondary text-xs mr-0.5">Patch</span>
          {label}
          <ChevronDown size={13} className="text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-36 rounded-xl border border-border bg-bg-card p-1 shadow-card animate-fade-in"
          sideOffset={4}
          align="end"
        >
          {/* Latest — resolves to current patch server-side */}
          <DropdownMenu.Item
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary cursor-pointer hover:bg-bg-elevated outline-none"
            onSelect={() => setSelectedPatch('')}
          >
            {!selectedPatch && <Check size={12} className="text-accent-gold" />}
            <span className={!selectedPatch ? 'text-accent-gold' : ''}>Latest</span>
            {data?.current && (
              <span className="ml-auto text-xs text-text-secondary">{data.current}</span>
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          {/* Loading skeleton */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary">
              <Loader2 size={12} className="animate-spin" />
              Loading patches…
            </div>
          )}

          {/* Patch list from API */}
          {patches.map((patch) => (
            <DropdownMenu.Item
              key={patch}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary cursor-pointer hover:bg-bg-elevated outline-none"
              onSelect={() => setSelectedPatch(patch)}
            >
              {selectedPatch === patch && <Check size={12} className="text-accent-gold" />}
              <span className={selectedPatch === patch ? 'text-accent-gold' : ''}>{patch}</span>
            </DropdownMenu.Item>
          ))}

          {/* Empty state — DB has no patch data yet */}
          {!isLoading && patches.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-secondary italic">No patches found</div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
