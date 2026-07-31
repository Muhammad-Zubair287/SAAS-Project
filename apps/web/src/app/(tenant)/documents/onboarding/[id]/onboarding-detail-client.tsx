'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import {
  useOnboardingTemplate,
  useUpdateOnboardingTemplate,
  useDeleteOnboardingTemplate,
} from '../../../../../modules/documents/hooks/use-documents';
import { ROUTES } from '../../../../../constants/routes.constants';

interface OnboardingDetailClientProps {
  id: string;
  sectionTitle: string;
}

export function OnboardingDetailClient({ id, sectionTitle }: OnboardingDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data: response, isLoading } = useOnboardingTemplate(id);
  const updateTemplate = useUpdateOnboardingTemplate(id);
  const deleteTemplate = useDeleteOnboardingTemplate();

  const template = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-canvas" />
        <div className="rounded-xl border border-border-default bg-surface-primary p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-canvas" />
          ))}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <p className="text-body-md text-semantic-danger">{t('errors.notFound')}</p>
    );
  }

  function handleToggleActive() {
    updateTemplate.mutate({ isActive: !template!.isActive });
  }

  function handleDelete() {
    if (window.confirm(t('common.confirmDelete'))) {
      deleteTemplate.mutate(id, {
        onSuccess: () => router.push(ROUTES.TENANT.DOCUMENTS.ONBOARDING),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={template.name}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.documents'), href: ROUTES.TENANT.DOCUMENTS.ROOT },
          { label: sectionTitle, href: ROUTES.TENANT.DOCUMENTS.ONBOARDING },
          { label: template.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={updateTemplate.isPending}
              className="rounded-md border border-border-default px-4 py-2 text-body-md font-semibold text-text-primary hover:bg-surface-canvas disabled:opacity-60 transition-colors"
            >
              {template.isActive
                ? t('organisation.status.inactive')
                : t('documents.fields.isActive')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
              className="rounded-md bg-semantic-danger px-4 py-2 text-body-md font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors"
            >
              {t('common.delete')}
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.name')}</dt>
            <dd className="mt-1 text-body-md text-text-primary">{template.name}</dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.status')}</dt>
            <dd className="mt-1 text-body-md text-text-primary">
              {template.isActive
                ? t('organisation.status.active')
                : t('organisation.status.inactive')}
            </dd>
          </div>
          {template.description && (
            <div className="sm:col-span-2">
              <dt className="text-body-sm font-medium text-text-secondary">
                {t('documents.fields.description')}
              </dt>
              <dd className="mt-1 text-body-md text-text-primary">{template.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {template.tasks && template.tasks.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-primary">
          <div className="border-b border-border-default px-6 py-4">
            <h2 className="text-heading-h3 font-semibold text-text-primary">
              Tasks ({template.tasks.length})
            </h2>
          </div>
          <ul className="divide-y divide-border-default">
            {template.tasks.map((task, idx) => (
              <li key={task.id} className="flex items-start gap-4 px-6 py-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue-600/10 text-caption font-semibold text-brand-blue-600">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-body-md font-medium text-text-primary">{task.title}</p>
                  <p className="text-body-sm text-text-secondary">
                    {t(`documents.taskType.${task.taskType}` as Parameters<typeof t>[0])}
                    {task.dueDays ? ` · Due in ${task.dueDays} days` : ''}
                    {task.isRequired ? ' · Required' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
