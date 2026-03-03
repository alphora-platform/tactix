import { useChampions } from '../../lib/hooks/useMetadata';
import { getChampionName, getChampionSquareUrl, getCostColor } from '../../lib/utils/gameAssets';
import { cn } from '../../lib/utils/cn';
import { Skeleton } from '../ui/Skeleton';

interface ChampionSquareProps {
  apiName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCost?: boolean;
  showStars?: number;
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function ChampionSquare({
  apiName,
  size = 'md',
  showCost = true,
  showStars = 0,
  className,
}: ChampionSquareProps) {
  const { data: champions, isLoading } = useChampions();

  if (isLoading) {
    return <Skeleton className={cn(SIZES[size], 'rounded-md', className)} />;
  }

  const name = getChampionName(apiName, champions);
  const url = getChampionSquareUrl(apiName, champions);
  const cost = champions?.[apiName]?.cost || 1;
  const costColor = getCostColor(cost);

  return (
    <div className={cn('relative inline-block', SIZES[size], className)} title={name}>
      <img
        src={url}
        alt={name}
        className="w-full h-full rounded-md object-cover bg-black/50 box-border"
        style={showCost ? { border: `2px solid ${costColor}` } : {}}
        onError={(e) => {
          e.currentTarget.src = '/assets/placeholder-champion.png';
        }}
      />
      {showStars > 0 && (
        <div className="absolute -bottom-2 left-0 right-0 flex justify-center drop-shadow-md z-10 space-x-0.5">
          {Array.from({ length: showStars }).map((_, i) => (
            <span key={i} className="text-yellow-400 text-[10px] leading-none drop-shadow-sm">
              ⭐
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
