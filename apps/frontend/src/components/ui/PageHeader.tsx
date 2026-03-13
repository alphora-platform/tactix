import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div>
        <h1 className="font-russo text-3xl font-normal tracking-wide text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="self-start sm:self-auto">{actions}</div> : null}
    </div>
  );
}
