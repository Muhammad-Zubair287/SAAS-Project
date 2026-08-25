'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import { useLeaveSummary } from '../../../modules/leave/hooks/use-leave';

export function LeaveHomePageClient() {
  const t = useTranslations('tenant.leave');
  const tn = useTranslations('tenant.nav');
  const summary = useLeaveSummary();
  const data = summary.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('home.title')}
        description={t('home.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('leave') },
        ]}
      />
      {summary.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title={t('home.pendingCount')} value={data?.pendingCount ?? 0} variant="warning" />
          <StatCard title={t('home.typesCount')} value={data?.typesCount ?? 0} variant="info" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={ROUTES.TENANT.LEAVE.REQUESTS}
          className="rounded-xl border border-border-default bg-surface-primary p-4 transition-colors hover:border-brand-blue-400"
        >
          <h2 className="text-title-md font-semibold text-text-primary">{t('home.links.requests')}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{t('home.links.requestsHint')}</p>
        </Link>
        <Link
          href={ROUTES.TENANT.LEAVE.TYPES}
          className="rounded-xl border border-border-default bg-surface-primary p-4 transition-colors hover:border-brand-blue-400"
        >
          <h2 className="text-title-md font-semibold text-text-primary">{t('home.links.types')}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{t('home.links.typesHint')}</p>
        </Link>
        <Link
          href={ROUTES.TENANT.LEAVE.ADJUST}
          className="rounded-xl border border-border-default bg-surface-primary p-4 transition-colors hover:border-brand-blue-400"
        >
          <h2 className="text-title-md font-semibold text-text-primary">{t('home.links.adjust')}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">{t('home.links.adjustHint')}</p>
        </Link>
      </div>
    </div>
  );
}
