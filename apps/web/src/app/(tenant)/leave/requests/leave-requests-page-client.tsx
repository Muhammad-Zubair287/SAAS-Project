'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import { usePagination } from '../../../../hooks/use-pagination';
import { useLeaveRequests } from '../../../../modules/leave/hooks/use-leave';

export function LeaveRequestsPageClient() {
  const t = useTranslations('tenant.leave');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const { page, pageSize, goToPage } = usePagination();
  const [status, setStatus] = useState('');
  const requests = useLeaveRequests({
    page,
    pageSize,
    ...(status ? { status } : {}),
  });
  const rows = requests.data?.data ?? [];
  const totalPages = requests.data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('requests.title')}
        description={t('requests.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('leave'), href: ROUTES.TENANT.LEAVE.ROOT },
          { label: t('requests.title') },
        ]}
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          goToPage(1);
        }}
        className="rounded-md border border-border-default bg-surface-primary px-3 py-2"
        aria-label={t('requests.filterStatus')}
      >
        <option value="">{t('requests.allStatuses')}</option>
        {['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'DRAFT', 'RETURNED'].map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
      {requests.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-canvas">
                <th className="px-4 py-3 text-left">{t('columns.employee')}</th>
                <th className="px-4 py-3 text-left">{t('columns.type')}</th>
                <th className="px-4 py-3 text-left">{t('columns.dates')}</th>
                <th className="px-4 py-3 text-left">{t('columns.quantity')}</th>
                <th className="px-4 py-3 text-left">{t('columns.status')}</th>
                <th className="px-4 py-3 text-left">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    {t('requests.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.employee.displayName ?? row.employeeId}</td>
                    <td className="px-4 py-3">{row.leaveType.name}</td>
                    <td className="px-4 py-3">
                      {row.startsOn} → {row.endsOn}
                    </td>
                    <td className="px-4 py-3">{row.requestedQuantity}</td>
                    <td className="px-4 py-3">{t(`status.${row.status}`)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={ROUTES.TENANT.LEAVE.REQUEST_DETAIL(row.id)}
                        className="text-brand-blue-600 hover:underline"
                      >
                        {tc('view')}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border-default px-3 py-2 disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-body-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border-default px-3 py-2 disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
