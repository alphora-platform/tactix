import { useTraits } from '../../lib/hooks/useMetadata';
import { getTraitName } from '../../lib/utils/gameAssets';
import { TraitIcon } from './TraitIcon';
import { cn } from '../../lib/utils/cn';

interface CompTraitRowProps {
  traitApiNames: string[];
  className?: string;
}

export function CompTraitRow({ traitApiNames, className }: CompTraitRowProps) {
  const { data: traits } = useTraits();

  if (!traitApiNames || traitApiNames.length === 0) {
    return <div className={cn('text-sm text-text-secondary', className)}>Unknown Comp</div>;
  }

  const topTraits = traitApiNames.slice(0, 2);
  const nameLabels = topTraits.map((t) => getTraitName(t, traits));
  const displayName = nameLabels.filter(Boolean).join(' ');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex -space-x-1 shrink-0">
        {topTraits.map((t) => (
          <div key={t} className="relative z-10 rounded-full border border-border bg-bg-card">
            <TraitIcon apiName={t} size="sm" />
          </div>
        ))}
      </div>
      <span className="text-sm font-medium text-text-primary truncate">
        {displayName || 'Unknown Comp'}
      </span>
    </div>
  );
}
