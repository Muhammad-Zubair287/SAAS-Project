'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../components/feedback/empty-state';
import { ROUTES } from '../../../constants/routes.constants';
import { useTenantAudit } from '../../../modules/tenant/hooks/use-tenant-admin';

export default function AuditPage() {
  const t = useTranslations();
  const [moduleFilter, setModuleFilter] = useState('');
  const { data, isLoading, isError, refetch } = useTenantAudit({
    module: moduleFilter || undefined,
    pageSize: 50,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title={t('common.error')}
        action={
          <button type="button" onClick={() => void refetch()}>
            {t('common.retry')}
          </button>
        }
      />
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.audit.title')}
        description={t('tenant.settings.audit.description')}
      />
      <input
        className="w-full max-w-sm rounded-md border border-border-default px-3 py-2"
        placeholder="Filter by module"
        value={moduleFilter}
        onChange={(e) => setModuleFilter(e.target.value)}
      />
      {rows.length === 0 ? (
        <EmptyState title={t('tenant.settings.audit.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="min-w-full text-left text-body-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-border-default">
                  <td className="px-3 py-2">{new Date(e.occurredAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{e.actorEmail ?? e.actorId}</td>
                  <td className="px-3 py-2">{e.module}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={ROUTES.TENANT.AUDIT_DETAIL(e.id)}
                      className="text-brand-blue-600"
                    >
                      {e.action}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {e.resourceType}
                    {e.resourceId ? ` · ${e.resourceId}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
