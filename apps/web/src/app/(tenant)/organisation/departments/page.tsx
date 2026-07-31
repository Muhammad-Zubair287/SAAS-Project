import { getTranslations } from 'next-intl/server';
import { DepartmentsPageClient } from './departments-page-client';

export default async function DepartmentsPage() {
  const t = await getTranslations();
  return (
    <DepartmentsPageClient
      title={t('organisation.departments.title')}
      description={t('organisation.departments.description')}
    />
  );
}
