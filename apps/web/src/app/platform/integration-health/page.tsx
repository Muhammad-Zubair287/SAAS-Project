import { getTranslations } from 'next-intl/server';
import { IntegrationHealthPageClient } from './integration-health-page-client';

export default async function IntegrationHealthPage() {
  const t = await getTranslations();
  return (
    <IntegrationHealthPageClient
      title={t('platform.integrationHealth.title')}
      description={t('platform.integrationHealth.description')}
    />
  );
}
