import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-1 text-body-sm text-text-secondary">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="select-none">/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-brand-blue-600 transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-text-primary">{crumb.label}</span>
                )}
              </span>
            ))}
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
