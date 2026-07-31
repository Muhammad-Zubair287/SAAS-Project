import { getTranslations } from 'next-intl/server';
import { EmployeesPageClient } from './employees-page-client';

export default async function EmployeesPage() {
  const t = await getTranslations();
  return (
    <EmployeesPageClient
      title={t('employees.directory.title')}
      description={t('employees.directory.description')}
    />
  );
}
