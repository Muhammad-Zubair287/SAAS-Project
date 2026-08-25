'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { platformApi } from '../../../modules/platform/api/platform-api';
import { ROUTES } from '../../../constants/routes.constants';

interface UsagePageClientProps {
  title: string;
  description: string;
}

export function UsagePageClient({ title, description }: UsagePageClientProps) {
  const t = useTranslations();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'usage', 'dashboard'],
    queryFn: () => platformApi.usage.dashboard(30),
  });
  const dash = data?.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: title },
        ]}
      />

      {isLoading && (
        <div className="flex justify-center p-12">
          <LoadingSpinner />
        </div>
      )}
      {isError && (
        <button type="button" onClick={() => void refetch()} className="text-brand-blue-600">
          {t('common.retry')}
        </button>
      )}

      {dash && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('platform.usage.totalSeats')} value={dash.kpis.totalSeats.toLocaleString()} />
            <StatCard
              title={t('platform.usage.activeEmployees')}
              value={dash.kpis.totalActiveEmployees.toLocaleString()}
              variant="success"
            />
            <StatCard
              title={t('platform.usage.utilisation')}
              value={`${dash.kpis.seatUtilisationPct}%`}
              variant={dash.kpis.seatUtilisationPct >= 90 ? 'danger' : 'info'}
            />
            <StatCard title="MRR" value={dash.kpis.estimatedMrr.toLocaleString()} variant="default" />
            <StatCard title="Storage (GB)" value={String(dash.kpis.storageUsedGb)} />
            <StatCard title="API calls (month)" value={dash.kpis.apiCallsMonth.toLocaleString()} />
          </div>

          <section className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h2 className="text-title-md font-semibold text-text-primary">{t('platform.usage.topTenants')}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-body-sm">
                <thead>
                  <tr className="text-start text-text-secondary">
                    <th className="pb-2 pe-4 font-medium">{t('platform.tenants.columns.name')}</th>
                    <th className="pb-2 pe-4 font-medium">{t('platform.usage.seats')}</th>
                    <th className="pb-2 pe-4 font-medium">API</th>
                    <th className="pb-2 font-medium">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.topTenants.map((row) => (
                    <tr key={row.tenantId} className="border-t border-border-default">
                      <td className="py-2 pe-4">
                        <Link href={ROUTES.PLATFORM.TENANT_DETAIL(row.tenantId)} className="text-brand-blue-600">
                          {row.displayName}
                        </Link>
                      </td>
                      <td className="py-2 pe-4">
                        {row.seatsUsed}/{row.seatLimit ?? '—'}
                      </td>
                      <td className="py-2 pe-4">{row.apiCallsMonth.toLocaleString()}</td>
                      <td className="py-2">{row.estimatedMrr.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
