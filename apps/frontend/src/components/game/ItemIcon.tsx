import { useItems } from '../../lib/hooks/useMetadata';
import { getItemName, getItemIconUrl } from '../../lib/utils/gameAssets';
import { cn } from '../../lib/utils/cn';
import { Skeleton } from '../ui/Skeleton';

interface ItemIconProps {
  apiName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function ItemIcon({ apiName, size = 'md', className }: ItemIconProps) {
  const { data: items, isLoading } = useItems();

  if (isLoading) {
    return <Skeleton className={cn(SIZES[size], 'rounded', className)} />;
  }

  const name = getItemName(apiName, items);
  const url = getItemIconUrl(apiName, items);

  return (
    <img
      src={url}
      alt={name}
      title={name}
      className={cn(SIZES[size], 'rounded bg-black/50 object-cover', className)}
      onError={(e) => {
        e.currentTarget.src = '/assets/placeholder-item.png';
      }}
    />
  );
}
