import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { CreateCostCentreForm } from '../../../../../modules/organisation/components/create-cost-centre-form';
import { ROUTES } from '../../../../../constants/routes.constants';

export default async function NewCostCentrePage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.costCentres.create.title')}
        description={t('organisation.costCentres.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: t('organisation.costCentres.title'), href: ROUTES.TENANT.ORGANISATION.COST_CENTRES },
          { label: t('organisation.costCentres.create.breadcrumb') },
        ]}
      />
      <CreateCostCentreForm />
    </div>
  );
}
