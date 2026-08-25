'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { tenantAdminApi } from '../../../../modules/tenant/api/tenant-admin-api';

export default function AuditDetailPage() {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-admin', 'audit', params.id],
    queryFn: () => tenantAdminApi.getAuditEvent(params.id),
    enabled: Boolean(params.id),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const event = (data as { data?: Record<string, unknown> } | undefined)?.data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('tenant.settings.audit.title')} description={String(event?.action ?? '')} />
      <pre className="overflow-x-auto rounded-lg border border-border-default bg-surface-card p-4 text-caption">
        {JSON.stringify(event, null, 2)}
      </pre>
    </div>
  );
}
