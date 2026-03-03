import { useAugments } from '../../lib/hooks/useMetadata';
import { getAugmentName, getAugmentIconUrl } from '../../lib/utils/gameAssets';
import { cn } from '../../lib/utils/cn';
import { Skeleton } from '../ui/Skeleton';

interface AugmentIconProps {
  apiName: string;
  size?: 'sm' | 'md' | 'lg';
  tier?: 'silver' | 'gold' | 'prismatic';
  className?: string;
}

const SIZES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function AugmentIcon({ apiName, size = 'md', tier, className }: AugmentIconProps) {
  const { data: augments, isLoading } = useAugments();

  if (isLoading) {
    return <Skeleton className={cn(SIZES[size], 'rounded-full', className)} />;
  }

  const name = getAugmentName(apiName, augments);
  const url = getAugmentIconUrl(apiName, augments);
  const actualTier = tier || augments?.[apiName]?.tier || 'gold';

  const glowStyles = {
    silver: 'drop-shadow-[0_0_4px_rgba(168,162,158,0.8)] border-stone-400',
    gold: 'drop-shadow-[0_0_4px_rgba(250,204,21,0.8)] border-yellow-400',
    prismatic: 'drop-shadow-[0_0_6px_rgba(236,72,153,0.8)] border-pink-500',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-black/40 border border-transparent',
        glowStyles[actualTier],
        SIZES[size],
        className
      )}
      title={name}
    >
      <img
        src={url}
        alt={name}
        className="w-full h-full object-contain p-0.5 rounded-full"
        onError={(e) => {
          e.currentTarget.src = '/assets/placeholder-augment.png';
        }}
      />
    </div>
  );
}
