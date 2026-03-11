interface SkeletonCardProps {
  rows?: number;
  showHeader?: boolean;
}

export function SkeletonCard({ rows = 4, showHeader = true }: SkeletonCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
      <div className="animate-pulse space-y-3">
        {showHeader ? <div className="h-4 w-1/3 rounded-md bg-[var(--bg-elevated)]" /> : null}
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-3.5 rounded-md bg-[var(--bg-elevated)]"
            style={{ width: `${Math.max(35, 100 - (index % 4) * 12)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
