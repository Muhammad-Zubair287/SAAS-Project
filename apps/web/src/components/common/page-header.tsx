import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Accessible name for the breadcrumb landmark. */
  breadcrumbLabel?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  breadcrumbLabel = 'Breadcrumb',
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label={breadcrumbLabel} className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-body-sm text-text-secondary">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="select-none" aria-hidden="true">
                        /
                      </span>
                    )}
                    {crumb.href && !isLast ? (
                      // next/link, not <a> — a raw anchor triggers a full page
                      // reload and discards the React Query cache.
                      <Link
                        href={crumb.href}
                        className="transition-colors hover:text-brand-blue-600"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className="text-text-primary"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <h1 className="text-heading-h1 font-bold text-text-primary truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-body-md text-text-secondary">{description}</p>
        )}
      </div>
      {actions && (
        <div className="mt-3 flex flex-shrink-0 items-center gap-3 sm:mt-0">{actions}</div>
      )}
    </div>
  );
}
