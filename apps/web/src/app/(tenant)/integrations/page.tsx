import { getTranslations } from 'next-intl/server';
import { IntegrationsPageClient } from './integrations-page-client';

export default async function IntegrationsPage() {
  const t = await getTranslations('tenant.integrations');
  return <IntegrationsPageClient title={t('title')} description={t('description')} />;
}
