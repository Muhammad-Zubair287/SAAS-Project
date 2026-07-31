import { getTranslations } from 'next-intl/server';
import { TemplatesPageClient } from './templates-page-client';

export default async function DocumentTemplatesPage() {
  const t = await getTranslations();
  return (
    <TemplatesPageClient
      title={t('documents.templates.title')}
      description={t('documents.templates.description')}
    />
  );
}
