import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { ROUTES } from '../../../../../constants/routes.constants';
import { StatusFormClient } from './status-form-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeStatusPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.statusChange.title')}
        description="Apply an employment status change with an effective date."
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.statusChange.title') },
        ]}
      />
      <StatusFormClient employeeId={id} />
    </div>
  );
}
