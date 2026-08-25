'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import { useIntegrations } from '../../../modules/integrations/hooks/use-integrations';

interface IntegrationsPageClientProps {
  title: string;
  description: string;
}

export function IntegrationsPageClient({ title, description }: IntegrationsPageClientProps) {
  const t = useTranslations();
  const { data, isLoading, isError, error } = useIntegrations();
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.home'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.integrations') },
        ]}
      />
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : null}
      {isError ? (
        <p className="text-body-md text-semantic-danger">
          {error instanceof Error ? error.message : t('common.error')}
        </p>
      ) : null}
      {!isLoading && !isError ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <article className="flex h-full flex-col rounded-xl border border-border-default bg-surface-primary p-4">
                <h2 className="text-title-md font-semibold text-text-primary">
                  {t(`tenant.integrations.categories.${item.category}` as Parameters<typeof t>[0])}
                </h2>
                <p className="mt-2 text-body-sm text-text-secondary">
                  {item.configured
                    ? t('tenant.integrations.status.configured')
                    : t('tenant.integrations.status.notConfigured')}
                </p>
                <Link
                  href={item.configureHref || ROUTES.TENANT.SETTINGS}
                  className="mt-4 inline-flex w-fit rounded-md border border-border-default px-3 py-1.5 text-body-sm font-medium text-brand-blue-600 hover:bg-surface-canvas"
                >
                  {t('tenant.integrations.configure')}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
