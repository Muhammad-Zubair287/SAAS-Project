import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { CreateDepartmentForm } from '../../../../../modules/organisation/components/create-department-form';
import { ROUTES } from '../../../../../constants/routes.constants';

export default async function NewDepartmentPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('organisation.departments.create.title')}
        description={t('organisation.departments.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: t('organisation.departments.title'), href: ROUTES.TENANT.ORGANISATION.DEPARTMENTS },
          { label: t('organisation.departments.create.breadcrumb') },
        ]}
      />
      <CreateDepartmentForm />
    </div>
  );
}
