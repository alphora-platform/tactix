import { Select } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings.store';
import { usePatchesQuery } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils/cn';

interface PatchSelectorProps {
  className?: string;
  onValueChange?: () => void;
}

export function PatchSelector({ className, onValueChange }: PatchSelectorProps) {
  const { selectedPatch, setSelectedPatch } = useSettingsStore();
  const { data } = usePatchesQuery();

  const options = (data?.patches ?? []).map((patch) => ({
    value: patch === data?.current ? '' : patch,
    label: patch === data?.current ? `${patch} (Latest)` : patch,
  }));

  // Fallback if no data yet
  if (options.length === 0) {
    options.push({ value: '', label: 'Loading...' });
  }

  return (
    <Select
      aria-label="Patch selector"
      value={selectedPatch}
      variant="filled"
      options={options}
      suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
      onChange={(value) => {
        setSelectedPatch(value);
        onValueChange?.();
      }}
      className={cn(
        'min-w-[164px]',
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
