'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { TenantDetailTabs } from '../../../../modules/platform/components/tenant-detail-tabs';
import { useTenant } from '../../../../modules/platform/hooks/use-tenants';
import { ROUTES } from '../../../../constants/routes.constants';

interface TenantDetailPageClientProps {
  tenantId: string;
  breadcrumbLabels: { overview: string; tenants: string; detail: string };
}

export function TenantDetailPageClient({
  tenantId,
  breadcrumbLabels,
}: TenantDetailPageClientProps) {
  const t = useTranslations();
  const { data, isLoading, error } = useTenant(tenantId);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('errors.notFound')}</p>
      </div>
    );
  }

  const tenant = data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenant.displayName}
        breadcrumbs={[
          { label: breadcrumbLabels.overview, href: ROUTES.PLATFORM.DASHBOARD },
          { label: breadcrumbLabels.tenants, href: ROUTES.PLATFORM.TENANTS },
          { label: breadcrumbLabels.detail },
        ]}
      />
      <TenantDetailTabs tenant={tenant} />
    </div>
  );
}
