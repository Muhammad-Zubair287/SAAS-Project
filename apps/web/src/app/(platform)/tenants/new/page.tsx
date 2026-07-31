import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../components/common/page-header';
import { CreateTenantWizard } from '../../../../modules/platform/components/create-tenant-wizard';
import { ROUTES } from '../../../../constants/routes.constants';

export default async function NewTenantPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platform.tenants.create.title')}
        description={t('platform.tenants.create.description')}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: t('platform.tenants.title'), href: ROUTES.PLATFORM.TENANTS },
          { label: t('platform.tenants.create.breadcrumb') },
        ]}
      />
      <CreateTenantWizard />
    </div>
  );
}
