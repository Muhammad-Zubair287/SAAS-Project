import { getTranslations } from 'next-intl/server';
import { HrDashboardPageClient } from './hr-dashboard-page-client';

export default async function HrDashboardPage() {
  const t = await getTranslations();
  return (
    <HrDashboardPageClient
      title={t('hr.dashboard.title')}
      description={t('hr.dashboard.description')}
    />
  );
}
