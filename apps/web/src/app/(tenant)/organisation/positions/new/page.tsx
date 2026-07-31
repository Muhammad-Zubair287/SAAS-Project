import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { CreatePositionForm } from '../../../../../modules/organisation/components/create-position-form';
import { ROUTES } from '../../../../../constants/routes.constants';

export default async function NewPositionPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.positions.create.title')}
        description={t('organisation.positions.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: t('organisation.positions.title'), href: ROUTES.TENANT.ORGANISATION.POSITIONS },
          { label: t('organisation.positions.create.breadcrumb') },
        ]}
      />
      <CreatePositionForm />
    </div>
  );
}
