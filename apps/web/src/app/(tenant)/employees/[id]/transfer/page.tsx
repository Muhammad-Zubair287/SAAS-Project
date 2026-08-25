import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../../components/common/page-header';
import { ROUTES } from '../../../../../constants/routes.constants';
import { TransferFormClient } from './transfer-form-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransferEmployeePage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.transfer.title')}
        description="Move an employee to another structure assignment."
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.transfer.title') },
        ]}
      />
      <TransferFormClient employeeId={id} />
    </div>
  );
}
