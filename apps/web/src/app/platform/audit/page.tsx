import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuditPageClient } from './audit-page-client';

interface AuditPageProps {
  searchParams: Promise<{ tenantId?: string }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const t = await getTranslations();
  const { tenantId } = await searchParams;
  return (
    <Suspense>
      <AuditPageClient
        title={t('platform.audit.title')}
        description={t('platform.audit.description')}
        initialTenantId={tenantId}
      />
    </Suspense>
  );
}
