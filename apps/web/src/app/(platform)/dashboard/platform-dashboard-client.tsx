'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { usePlatformStats, useTenants } from '../../../modules/platform/hooks/use-tenants';
import { TenantsTable } from '../../../modules/platform/components/tenants-table';
import { ROUTES } from '../../../constants/routes.constants';

interface PlatformDashboardClientProps {
  title: string;
  description: string;
}

export function PlatformDashboardClient({ title, description }: PlatformDashboardClientProps) {
  const t = useTranslations();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: recentTenants, isLoading: tenantsLoading } = useTenants({
    page: 1,
    pageSize: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link
            href={ROUTES.PLATFORM.TENANTS_NEW}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-blue-700"
          >
            {t('platform.tenants.createButton')}
          </Link>
        }
      />

      {/* KPI Row */}
      {statsLoading ? (
        <div className="flex h-24 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard
            title={t('platform.dashboard.stats.total')}
            value={stats?.data.total ?? 0}
            variant="default"
          />
          <StatCard
            title={t('platform.dashboard.stats.active')}
            value={stats?.data.active ?? 0}
            variant="success"
          />
          <StatCard
            title={t('platform.dashboard.stats.draft')}
            value={stats?.data.draft ?? 0}
            variant="info"
          />
          <StatCard
            title={t('platform.dashboard.stats.suspended')}
            value={stats?.data.suspended ?? 0}
            variant="warning"
          />
          <StatCard
            title={t('platform.dashboard.stats.closed')}
            value={stats?.data.closed ?? 0}
            variant="default"
          />
        </div>
      )}

      {/* Recent Tenants */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading-h3 font-bold text-text-primary">
            {t('platform.dashboard.recentTenants')}
          </h2>
          <Link
            href={ROUTES.PLATFORM.TENANTS}
            className="text-body-md font-medium text-brand-blue-600 hover:text-blue-700"
          >
            {t('common.view')} {t('common.actions')} →
          </Link>
        </div>
        <TenantsTable
          data={recentTenants?.data ?? []}
          isLoading={tenantsLoading}
        />
      </div>
    </div>
  );
}
