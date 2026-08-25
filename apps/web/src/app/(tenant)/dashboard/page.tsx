import { getTranslations } from 'next-intl/server';
import { DashboardPageClient } from './dashboard-page-client';

export default async function TenantDashboardPage() {
  const t = await getTranslations();
  return (
    <DashboardPageClient
      title={t('tenant.dashboard.title')}
      description={t('tenant.dashboard.description')}
    />
  );
}
