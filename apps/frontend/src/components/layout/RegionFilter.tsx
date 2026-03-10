import { Select } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings.store';
import { cn } from '@/lib/utils/cn';

const REGIONS = [
  { value: '', label: 'All Regions' },
  { value: 'KR', label: 'Korea (KR)' },
  { value: 'EUW', label: 'Europe West (EUW)' },
  { value: 'NA', label: 'North America (NA)' },
  { value: 'EUNE', label: 'Europe Nordic & East (EUNE)' },
  { value: 'BR', label: 'Brazil (BR)' },
  { value: 'JP', label: 'Japan (JP)' },
  { value: 'OCE', label: 'Oceania (OCE)' },
] as const;

interface RegionFilterProps {
  className?: string;
  onValueChange?: () => void;
}

export function RegionFilter({ className, onValueChange }: RegionFilterProps) {
  const { selectedRegion, setSelectedRegion } = useSettingsStore();

  return (
    <Select
      aria-label="Region selector"
      value={selectedRegion}
      variant="filled"
      options={REGIONS}
      suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
      onChange={(value) => {
        setSelectedRegion(value);
        onValueChange?.();
      }}
      className={cn(
        'min-w-[220px]',
        '[&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border [&_.ant-select-selector]:!border-[var(--border-default)]',
        '[&_.ant-select-selector]:!bg-[var(--bg-elevated)] [&_.ant-select-selector]:!shadow-none',
        '[&_.ant-select-selection-item]:!text-sm [&_.ant-select-selection-item]:!text-slate-100',
        '[&_.ant-select-selection-placeholder]:!text-slate-400',
        '[&_.ant-select-arrow]:!text-slate-400',
        className
      )}
      popupClassName="[&_.ant-select-item]:!text-sm [&_.ant-select-item-option-content]:!text-slate-100"
    />
  );
}
