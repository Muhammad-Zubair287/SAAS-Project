import { getTranslations } from 'next-intl/server';
import { PlansPageClient } from './plans-page-client';

export default async function PlansPage() {
  const t = await getTranslations();
  return <PlansPageClient title={t('platform.plans.title')} description={t('platform.plans.description')} />;
}
