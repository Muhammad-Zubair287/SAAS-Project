'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import { usePayrollSummary } from '../../../modules/payroll/hooks/use-payroll';

export function PayrollHomePageClient() {
  const t = useTranslations('tenant.payroll');
  const tn = useTranslations('tenant.nav');
  const summary = usePayrollSummary();
  const data = summary.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('home.title')}
        description={t('home.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('payroll') },
        ]}
      />
      {summary.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title={t('home.published')} value={data?.publishedCount ?? 0} variant="success" />
          <StatCard title={t('home.generated')} value={data?.generatedCount ?? 0} variant="info" />
          <StatCard title={t('home.total')} value={data?.totalCount ?? 0} />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.TENANT.PAYROLL.PAYSLIPS}
          className="rounded-xl border border-border-default bg-surface-primary p-4 hover:border-brand-blue-400"
        >
          <h2 className="text-title-md font-semibold">{t('home.links.payslips')}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{t('home.links.payslipsHint')}</p>
        </Link>
        <Link
          href={ROUTES.TENANT.PAYROLL.PUBLISH}
          className="rounded-xl border border-border-default bg-surface-primary p-4 hover:border-brand-blue-400"
        >
          <h2 className="text-title-md font-semibold">{t('home.links.publish')}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{t('home.links.publishHint')}</p>
        </Link>
      </div>
    </div>
  );
}
