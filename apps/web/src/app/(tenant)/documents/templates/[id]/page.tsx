import { getTranslations } from 'next-intl/server';
import { TemplateDetailClient } from './template-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentTemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  return <TemplateDetailClient id={id} title={t('documents.templates.title')} />;
}
