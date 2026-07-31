import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { EditEmployeeForm } from './edit-employee-form';
import { ROUTES } from '../../../../../constants/routes.constants';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.edit.title')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.detail.breadcrumb'), href: ROUTES.TENANT.EMPLOYEES.DETAIL(id) },
          { label: t('employees.edit.breadcrumb') },
        ]}
      />
      <EditEmployeeForm id={id} />
    </div>
  );
}
