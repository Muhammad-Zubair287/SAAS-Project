import { getTranslations } from 'next-intl/server';
import { ReportsPageClient } from './reports-page-client';

export default async function ReportsPage() {
  const t = await getTranslations('tenant.reports');
  return <ReportsPageClient title={t('title')} description={t('description')} />;
}
