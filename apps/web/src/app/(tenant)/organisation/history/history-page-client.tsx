'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import { usePagination } from '../../../../hooks/use-pagination';
import { useOrganisationHistory } from '../../../../modules/organisation/hooks/use-org-overview';

export function HistoryPageClient({ title, description }: { title: string; description: string }) {
  const t = useTranslations();
  const { page, pageSize, goToPage } = usePagination();
  const history = useOrganisationHistory({ page, pageSize });
  const rows = history.data?.data ?? [];
  const totalPages = history.data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: title },
        ]}
      />
      <div className="rounded-xl border border-border-default bg-surface-primary">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Change</th>
              <th className="px-4 py-3 text-left">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.effectiveDate}</td>
                <td className="px-4 py-3">{item.entityType}</td>
                <td className="px-4 py-3">{item.changeType}</td>
                <td className="px-4 py-3">{item.changedBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-border-default px-3 py-2 disabled:opacity-40">←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-border-default px-3 py-2 disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
