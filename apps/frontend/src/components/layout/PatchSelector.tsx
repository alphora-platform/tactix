import { Select } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings.store';
import { cn } from '@/lib/utils/cn';

const PATCH_OPTIONS = [
  { value: '', label: '16.5 (Latest)' },
  { value: '16.4', label: '16.4' },
  { value: '16.3', label: '16.3' },
  { value: '16.2', label: '16.2' },
] as const;

interface PatchSelectorProps {
  className?: string;
  onValueChange?: () => void;
}

export function PatchSelector({ className, onValueChange }: PatchSelectorProps) {
  const { selectedPatch, setSelectedPatch } = useSettingsStore();

  return (
    <Select
      aria-label="Patch selector"
      value={selectedPatch}
      variant="filled"
      options={PATCH_OPTIONS}
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
