'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import { usePagination } from '../../../../hooks/use-pagination';
import { useAdminPayslips } from '../../../../modules/payroll/hooks/use-payroll';

export function PayslipsListPageClient() {
  const t = useTranslations('tenant.payroll');
  const tn = useTranslations('tenant.nav');
  const { page, pageSize, goToPage } = usePagination();
  const [status, setStatus] = useState('');
  const list = useAdminPayslips({
    page,
    pageSize,
    ...(status ? { status } : {}),
  });
  const rows = list.data?.data ?? [];
  const totalPages = list.data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payslips.title')}
        description={t('payslips.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('payroll'), href: ROUTES.TENANT.PAYROLL.ROOT },
          { label: t('payslips.title') },
        ]}
        actions={
          <Link
            href={ROUTES.TENANT.PAYROLL.PUBLISH}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-semibold text-white"
          >
            {t('payslips.publishCta')}
          </Link>
        }
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          goToPage(1);
        }}
        className="rounded-md border border-border-default bg-surface-primary px-3 py-2"
        aria-label={t('payslips.filterStatus')}
      >
        <option value="">{t('payslips.allStatuses')}</option>
        <option value="PUBLISHED">PUBLISHED</option>
        <option value="GENERATED">GENERATED</option>
        <option value="WITHDRAWN">WITHDRAWN</option>
      </select>
      {list.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-canvas">
                <th className="px-4 py-3 text-left">{t('columns.employee')}</th>
                <th className="px-4 py-3 text-left">{t('columns.period')}</th>
                <th className="px-4 py-3 text-left">{t('columns.gross')}</th>
                <th className="px-4 py-3 text-left">{t('columns.net')}</th>
                <th className="px-4 py-3 text-left">{t('columns.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    {t('payslips.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.employee.displayName ?? row.employeeId}</td>
                    <td className="px-4 py-3">{row.periodLabel}</td>
                    <td className="px-4 py-3">
                      {row.currency} {row.grossAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {row.currency} {row.netAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
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
