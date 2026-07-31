import { getTranslations } from 'next-intl/server';
import { OnboardingDetailClient } from './onboarding-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OnboardingTemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  return <OnboardingDetailClient id={id} sectionTitle={t('documents.onboarding.title')} />;
}
