import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  'aria-label'?: string;
}

export function Skeleton({
  className,
  'aria-label': ariaLabel,
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel ?? 'Loading...'}
      aria-busy="true"
      className={clsx('animate-pulse rounded-md bg-gray-200', className)}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx('space-y-2', className)}
      role="status"
      aria-label="Loading..."
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}
