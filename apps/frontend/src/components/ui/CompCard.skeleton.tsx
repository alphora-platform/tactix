function CompCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
      <div className="animate-pulse">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-5 w-8 rounded-full bg-[var(--bg-overlay)]/70" />
          <div className="h-4 flex-1 rounded-md bg-[var(--bg-overlay)]/70" />
        </div>

        <div className="mb-4 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <div className="h-2 w-10 rounded bg-[var(--bg-overlay)]/65" />
              <div className="h-4 w-12 rounded bg-[var(--bg-overlay)]/75" />
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <div className="h-3 w-20 rounded bg-[var(--bg-overlay)]/60" />
        </div>
      </div>
    </div>
  );
}

export function CompCardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <CompCardSkeleton key={index} />
      ))}
    </div>
  );
}
