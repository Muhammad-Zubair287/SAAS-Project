import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../components/common/page-header';
import { ROUTES } from '../../../constants/routes.constants';

export default async function OrganisationOverviewPage() {
  const t = await getTranslations();

  const sections = [
    {
      key: 'legalEntities',
      title: t('organisation.legalEntities.title'),
      description: t('organisation.legalEntities.description'),
      href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES,
    },
    {
      key: 'branches',
      title: t('organisation.branches.title'),
      description: t('organisation.branches.description'),
      href: ROUTES.TENANT.ORGANISATION.BRANCHES,
    },
    {
      key: 'departments',
      title: t('organisation.departments.title'),
      description: t('organisation.departments.description'),
      href: ROUTES.TENANT.ORGANISATION.DEPARTMENTS,
    },
    {
      key: 'costCentres',
      title: t('organisation.costCentres.title'),
      description: t('organisation.costCentres.description'),
      href: ROUTES.TENANT.ORGANISATION.COST_CENTRES,
    },
    {
      key: 'positions',
      title: t('organisation.positions.title'),
      description: t('organisation.positions.description'),
      href: ROUTES.TENANT.ORGANISATION.POSITIONS,
    },
  ];

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="group rounded-xl border border-border-default bg-surface-primary p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-heading-h3 font-semibold text-text-primary group-hover:text-brand-blue-600 transition-colors">
              {s.title}
            </h2>
            <p className="mt-1 text-body-sm text-text-secondary">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
