import { getTranslations } from 'next-intl/server';
import { UsagePageClient } from './usage-page-client';

export default async function UsagePage() {
  const t = await getTranslations();
  return <UsagePageClient title={t('platform.usage.title')} description={t('platform.usage.description')} />;
}
