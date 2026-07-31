import { getTranslations } from 'next-intl/server';
import { EmployeeDetailClient } from './employee-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  return (
    <EmployeeDetailClient
      id={id}
      labels={{
        dashboard: t('tenant.nav.dashboard'),
        employees: t('employees.directory.title'),
        detail: t('employees.detail.breadcrumb'),
      }}
    />
  );
}
