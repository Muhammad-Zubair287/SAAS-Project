import { getTranslations } from 'next-intl/server';
import { TenantsPageClient } from './tenants-page-client';

export default async function TenantsPage() {
  const t = await getTranslations();
  return (
    <TenantsPageClient
      title={t('platform.tenants.title')}
      description={t('platform.tenants.description')}
    />
  );
}
