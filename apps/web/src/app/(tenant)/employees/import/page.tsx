import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import { ImportPageClient } from './import-page-client';

export default async function EmployeesImportPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.import.title')}
        description={t('employees.import.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.import.title') },
        ]}
      />
      <ImportPageClient />
    </div>
  );
}
