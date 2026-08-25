'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { ROUTES } from '../../../constants/routes.constants';
import { useOrganisationOverview } from '../../../modules/organisation/hooks/use-org-overview';

export function OrganisationOverviewClient() {
  const t = useTranslations();
  const overview = useOrganisationOverview();

  const counts = overview.data?.data.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.overview.title')}
        description={t('organisation.overview.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation') },
        ]}
      />

      {counts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Legal entities" value={counts.legalEntities} />
          <StatCard title="Branches" value={counts.branches} />
          <StatCard title="Departments" value={counts.departments} />
          <StatCard title="Grades" value={counts.grades} />
          <StatCard title="Positions" value={counts.positions} />
          <StatCard title="Active employees" value={counts.activeEmployees} />
          <StatCard title="Unassigned employees" value={counts.unassignedEmployees} variant="warning" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { key: 'departments', title: t('organisation.nav.departments'), href: ROUTES.TENANT.ORGANISATION.DEPARTMENTS },
          { key: 'grades', title: 'Grades', href: ROUTES.TENANT.ORGANISATION.GRADES },
          { key: 'history', title: 'History', href: ROUTES.TENANT.ORGANISATION.HISTORY },
          { key: 'legalEntities', title: t('organisation.nav.legalEntities'), href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES },
          { key: 'branches', title: t('organisation.nav.branches'), href: ROUTES.TENANT.ORGANISATION.BRANCHES },
          { key: 'positions', title: t('organisation.nav.positions'), href: ROUTES.TENANT.ORGANISATION.POSITIONS },
        ].map((item) => (
          <Link key={item.key} href={item.href} className="group rounded-xl border border-border-default bg-surface-primary p-6 transition-shadow hover:shadow-md">
            <h2 className="text-heading-h3 font-semibold text-text-primary group-hover:text-brand-blue-600 transition-colors">{item.title}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
