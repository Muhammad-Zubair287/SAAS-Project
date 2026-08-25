'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { apiClient } from '../../../lib/api/client';
import { ROUTES } from '../../../constants/routes.constants';

export function DocumentLibraryClient() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['documents', 'library'],
    queryFn: () => apiClient.get('/documents', { params: { pageSize: 50 } }).then((r) => r.data),
  });
  const approve = useMutation({
    mutationFn: (id: string) => apiClient.post(`/documents/${id}/approve`, {}).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents', 'library'] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/documents/${id}/reject`, { reason: 'Rejected by HR' }).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents', 'library'] }),
  });

  const rows =
    (data as { data?: Array<{ id: string; title: string; status: string; documentType: string; employeeId: string }> })
      ?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('documents.library.title')}
        description={t('documents.library.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('documents.library.title') },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={ROUTES.TENANT.DOCUMENTS.TEMPLATES} className="rounded-md border border-border-default px-3 py-2 text-body-sm">
              {t('documents.templates.title')}
            </Link>
            <Link href={ROUTES.TENANT.DOCUMENTS.ONBOARDING} className="rounded-md border border-border-default px-3 py-2 text-body-sm">
              {t('documents.onboarding.title')}
            </Link>
          </div>
        }
      />
      {isLoading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <p className="text-text-secondary">{t('common.empty')}</p>
      ) : (
        <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-surface-primary">
          {rows.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-body-sm text-text-secondary">
                  {doc.documentType} · {doc.status}
                </p>
              </div>
              {doc.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-brand-blue-600 px-3 py-1.5 text-body-sm text-white"
                    onClick={() => approve.mutate(doc.id)}
                  >
                    {t('documents.library.approve')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border-default px-3 py-1.5 text-body-sm"
                    onClick={() => reject.mutate(doc.id)}
                  >
                    {t('documents.library.reject')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
