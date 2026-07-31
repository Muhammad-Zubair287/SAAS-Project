'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import {
  useDocumentTemplate,
  useUpdateDocumentTemplate,
  useDeleteDocumentTemplate,
} from '../../../../../modules/documents/hooks/use-documents';
import { DocumentStatusBadge } from '../../../../../modules/documents/components/document-status-badge';
import { ROUTES } from '../../../../../constants/routes.constants';

interface TemplateDetailClientProps {
  id: string;
  title: string;
}

export function TemplateDetailClient({ id, title }: TemplateDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data: response, isLoading } = useDocumentTemplate(id);
  const updateTemplate = useUpdateDocumentTemplate(id);
  const deleteTemplate = useDeleteDocumentTemplate();

  const template = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-canvas" />
        <div className="rounded-xl border border-border-default bg-surface-primary p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
        onSuccess: () => router.push(ROUTES.TENANT.DOCUMENTS.TEMPLATES),
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
          { label: title, href: ROUTES.TENANT.DOCUMENTS.TEMPLATES },
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
              {template.isActive ? t('common.edit') : t('documents.fields.isActive')}
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
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.documentType')}</dt>
            <dd className="mt-1 text-body-md text-text-primary">{template.type}</dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.status')}</dt>
            <dd className="mt-1">
              <DocumentStatusBadge status={template.isActive ? 'ACTIVE' : 'EXPIRED'} />
            </dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.isRequired')}</dt>
            <dd className="mt-1 text-body-md text-text-primary">
              {template.isRequired ? t('common.required') : t('common.optional')}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.expiryMonths')}</dt>
            <dd className="mt-1 text-body-md text-text-primary">
              {template.expiryMonths ? `${template.expiryMonths} months` : '—'}
            </dd>
          </div>
          {template.description && (
            <div className="sm:col-span-2">
              <dt className="text-body-sm font-medium text-text-secondary">{t('documents.fields.description')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">{template.description}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
