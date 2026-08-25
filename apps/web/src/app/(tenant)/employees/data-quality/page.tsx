import { getTranslations } from 'next-intl/server';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import { DataQualityPageClient } from './data-quality-page-client';

export default async function EmployeesDataQualityPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('employees.dataQuality.title')}
        description={t('employees.dataQuality.description')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('employees.directory.title'), href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: t('employees.dataQuality.title') },
        ]}
      />
      <DataQualityPageClient />
    </div>
  );
}
