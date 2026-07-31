import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../components/common/page-header';
import { CreateEmployeeForm } from './create-employee-form';
import { ROUTES } from '../../../../constants/routes.constants';

export default async function NewEmployeePage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.create.title')}
        description={t('employees.create.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.create.title') },
        ]}
      />
      <CreateEmployeeForm />
    </div>
  );
}
