import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../components/common/page-header';
import { ROUTES } from '../../../constants/routes.constants';

export default async function DocumentsOverviewPage() {
  const t = await getTranslations();

  const sections = [
    {
      key: 'templates',
      title: t('documents.templates.title'),
      description: t('documents.templates.description'),
      href: ROUTES.TENANT.DOCUMENTS.TEMPLATES,
    },
    {
      key: 'onboarding',
      title: t('documents.onboarding.title'),
      description: t('documents.onboarding.description'),
      href: ROUTES.TENANT.DOCUMENTS.ONBOARDING,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('documents.overview.title')}
        description={t('documents.overview.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.documents') },
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
