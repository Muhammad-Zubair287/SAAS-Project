import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 text-text-disabled">{icon}</div>}
      <h3 className="text-h3 text-brand-navy-950">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-body-md text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
