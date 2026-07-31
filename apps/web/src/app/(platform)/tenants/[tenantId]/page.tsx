import { getTranslations } from 'next-intl/server';
import { TenantDetailPageClient } from './tenant-detail-client';

interface TenantDetailPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { tenantId } = await params;
  const t = await getTranslations();

  return (
    <TenantDetailPageClient
      tenantId={tenantId}
      breadcrumbLabels={{
        overview: t('platform.nav.overview'),
        tenants: t('platform.tenants.title'),
        detail: t('platform.tenants.detail.breadcrumb'),
      }}
    />
  );
}
