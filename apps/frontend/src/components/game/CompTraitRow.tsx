import { useTraits } from '../../lib/hooks/useMetadata';
import { getTraitName } from '../../lib/utils/gameAssets';
import { resolveCompName } from '../../lib/utils/compName';
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
  const displayTraits = traitApiNames.slice(0, 3);

  // Build friendly name from top-2 trait names, falling back through resolveCompName
  const syntheticLabel = topTraits
    .map((t) => getTraitName(t, traits))
    .filter(Boolean)
    .join(' ');
  const compId = traitApiNames[0];
  const displayName = syntheticLabel || resolveCompName(compId, undefined, traits);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Icons: side-by-side with a small gap — no overlap */}
      <div className="flex items-center gap-1 shrink-0">
        {displayTraits.map((t) => (
          <TraitIcon key={t} apiName={t} size="sm" />
        ))}
      </div>
      <span className="text-sm font-medium text-text-primary truncate">
        {displayName || 'Unknown Comp'}
      </span>
    </div>
  );
}
