'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import { useAttendanceExceptions, useResolveAttendanceException } from '../../../../modules/attendance/hooks/use-attendance';
import { usePagination } from '../../../../hooks/use-pagination';

export function ExceptionsPageClient({ title, description }: { title: string; description: string }) {
  const t = useTranslations();
  const { page, pageSize, goToPage } = usePagination();
  const [isResolved, setIsResolved] = useState('');
  const exceptions = useAttendanceExceptions({
    page,
    pageSize,
    isResolved: isResolved ? isResolved === 'true' : undefined,
  });
  const resolve = useResolveAttendanceException();
  const totalPages = exceptions.data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.attendance'), href: ROUTES.TENANT.ATTENDANCE.ROOT },
          { label: title },
        ]}
      />
      <select value={isResolved} onChange={(e) => setIsResolved(e.target.value)} className="rounded-md border border-border-default bg-surface-primary px-3 py-2">
        <option value="">All</option>
        <option value="false">Open</option>
        <option value="true">Resolved</option>
      </select>
      <div className="rounded-xl border border-border-default bg-surface-primary">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              <th className="px-4 py-3 text-left">{t('attendance.columns.date')}</th>
              <th className="px-4 py-3 text-left">{t('attendance.columns.type')}</th>
              <th className="px-4 py-3 text-left">{t('attendance.columns.severity')}</th>
              <th className="px-4 py-3 text-left">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {(exceptions.data?.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.exceptionDate}</td>
                <td className="px-4 py-3">{row.exceptionType}</td>
                <td className="px-4 py-3">{row.severity}</td>
                <td className="px-4 py-3">
                  {!row.isResolved && (
                    <button type="button" onClick={() => void resolve.mutateAsync({ id: row.id, payload: {} })} className="text-brand-blue-600 hover:underline">
                      {t('attendance.exceptions.resolveButton')}
                    </button>
                  )}
                </td>
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
