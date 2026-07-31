import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { CreateLegalEntityForm } from '../../../../../modules/organisation/components/create-legal-entity-form';
import { ROUTES } from '../../../../../constants/routes.constants';

export default async function NewLegalEntityPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.legalEntities.create.title')}
        description={t('organisation.legalEntities.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: t('organisation.legalEntities.title'), href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES },
          { label: t('organisation.legalEntities.create.breadcrumb') },
        ]}
      />
      <CreateLegalEntityForm />
    </div>
  );
}
