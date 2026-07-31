'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { useCreateOnboardingTemplate } from '../../../../../modules/documents/hooks/use-documents';
import { ROUTES } from '../../../../../constants/routes.constants';
import type { CreateOnboardingTemplatePayload } from '../../../../../modules/documents/types/documents.types';

export default function NewOnboardingTemplatePage() {
  const t = useTranslations();
  const router = useRouter();
  const createTemplate = useCreateOnboardingTemplate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: CreateOnboardingTemplatePayload = {
      name: data.get('name') as string,
      description: (data.get('description') as string) || undefined,
      isActive: true,
    };

    createTemplate.mutate(payload, {
      onSuccess: () => {
        router.push(ROUTES.TENANT.DOCUMENTS.ONBOARDING);
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('documents.onboarding.createButton')}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.documents'), href: ROUTES.TENANT.DOCUMENTS.ROOT },
          { label: t('documents.onboarding.title'), href: ROUTES.TENANT.DOCUMENTS.ONBOARDING },
          { label: t('documents.onboarding.createButton') },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1">
            {t('documents.fields.name')} *
          </label>
          <input
            name="name"
            required
            maxLength={200}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1">
            {t('documents.fields.description')}
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createTemplate.isPending}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-brand-blue-500 disabled:opacity-60 transition-colors"
          >
            {createTemplate.isPending ? t('common.loading') : t('documents.onboarding.createButton')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-border-default px-4 py-2 text-body-md font-semibold text-text-primary hover:bg-surface-canvas transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>

        {createTemplate.isError && (
          <p className="text-body-sm text-semantic-danger">{t('errors.generic')}</p>
        )}
      </form>
    </div>
  );
}
