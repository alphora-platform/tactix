import { useTraits } from '../../lib/hooks/useMetadata';
import { getTraitName, getTraitIconUrl } from '../../lib/utils/gameAssets';
import { cn } from '../../lib/utils/cn';
import { Skeleton } from '../ui/Skeleton';

interface TraitIconProps {
  apiName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function TraitIcon({ apiName, size = 'md', className }: TraitIconProps) {
  const { data: traits, isLoading } = useTraits();

  if (isLoading) {
    return <Skeleton className={cn(SIZES[size], 'rounded-full', className)} />;
  }

  const name = getTraitName(apiName, traits);
  const url = getTraitIconUrl(apiName, traits);

  return (
    <img
      src={url}
      alt={name}
      title={name}
      className={cn(SIZES[size], 'rounded bg-black/50 object-contain', className)}
      onError={(e) => {
        e.currentTarget.src = '/assets/placeholder-trait.png';
      }}
    />
  );
}
