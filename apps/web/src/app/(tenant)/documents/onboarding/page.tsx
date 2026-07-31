import { getTranslations } from 'next-intl/server';
import { OnboardingPageClient } from './onboarding-page-client';

export default async function OnboardingPage() {
  const t = await getTranslations();
  return (
    <OnboardingPageClient
      title={t('documents.onboarding.title')}
      description={t('documents.onboarding.description')}
    />
  );
}
