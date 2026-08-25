import { getTranslations } from 'next-intl/server';
import { SupportPageClient } from './support-page-client';

export default async function SupportPage() {
  const t = await getTranslations();
  return <SupportPageClient title={t('platform.support.title')} description={t('platform.support.description')} />;
}
