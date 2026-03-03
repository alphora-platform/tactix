import { ChevronDown, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSettingsStore } from '@/lib/store/settings.store';

const REGIONS = [
  { code: '', label: 'All Regions' },
  { code: 'KR', label: '🇰🇷 Korea' },
  { code: 'EUW', label: '🇪🇺 EUW' },
  { code: 'NA', label: '🇺🇸 NA' },
  { code: 'EUNE', label: 'EUNE' },
  { code: 'BR', label: '🇧🇷 Brazil' },
];

export function RegionFilter() {
  const { selectedRegion, setSelectedRegion } = useSettingsStore();
  const current = REGIONS.find((r) => r.code === selectedRegion) ?? REGIONS[0]!;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary hover:border-accent-blue/50 transition-colors outline-none">
          {current.label}
          <ChevronDown size={13} className="text-text-secondary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-40 rounded-xl border border-border bg-bg-card p-1 shadow-card animate-fade-in"
          sideOffset={4}
          align="end"
        >
          {REGIONS.map(({ code, label }) => (
            <DropdownMenu.Item
              key={code}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary cursor-pointer hover:bg-bg-elevated outline-none"
              onSelect={() => setSelectedRegion(code)}
            >
              {selectedRegion === code && <Check size={12} className="text-accent-blue" />}
              <span className={selectedRegion === code ? 'text-accent-blue' : ''}>{label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
