'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import { useAdminPayslips } from '../../../../modules/payroll/hooks/use-payroll';

interface PayrollPayslipsPageClientProps {
  title: string;
  description: string;
}

export function PayrollPayslipsPageClient({ title, description }: PayrollPayslipsPageClientProps) {
  const t = useTranslations('tenant.payroll.payslips');
  const tn = useTranslations('tenant.nav');
  const { data, isLoading, isError, error } = useAdminPayslips({ pageSize: 50 });
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('payroll'), href: ROUTES.TENANT.PAYROLL.ROOT },
          { label: t('title') },
        ]}
        actions={
          <Link
            href={ROUTES.TENANT.PAYROLL.PUBLISH}
            className="rounded-md bg-brand-blue-600 px-3 py-2 text-body-sm font-medium text-white hover:bg-brand-blue-500"
          >
            {t('publish')}
          </Link>
        }
      />
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : null}
      {isError ? (
        <p className="text-semantic-danger">{error instanceof Error ? error.message : 'Error'}</p>
      ) : null}
      {!isLoading && rows.length === 0 ? (
        <p className="text-body-md text-text-secondary">{t('empty')}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="min-w-full text-start text-body-sm">
            <thead className="bg-surface-canvas text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">{t('columns.employee')}</th>
                <th className="px-3 py-2 font-medium">{t('columns.period')}</th>
                <th className="px-3 py-2 font-medium">{t('columns.gross')}</th>
                <th className="px-3 py-2 font-medium">{t('columns.net')}</th>
                <th className="px-3 py-2 font-medium">{t('columns.status')}</th>
                <th className="px-3 py-2 font-medium">{t('columns.publishedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border-default">
                  <td className="px-3 py-2">{row.employee.displayName}</td>
                  <td className="px-3 py-2">{row.periodLabel}</td>
                  <td className="px-3 py-2">
                    {row.currency} {row.grossAmount}
                  </td>
                  <td className="px-3 py-2">
                    {row.currency} {row.netAmount}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.publishedAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
