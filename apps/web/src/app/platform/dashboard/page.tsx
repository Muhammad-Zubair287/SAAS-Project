import { getTranslations } from 'next-intl/server';
import { PlatformDashboardClient } from './platform-dashboard-client';

export default async function PlatformDashboardPage() {
  const t = await getTranslations();
  return (
    <PlatformDashboardClient
      title={t('platform.dashboard.title')}
      description={t('platform.dashboard.description')}
    />
  );
}
