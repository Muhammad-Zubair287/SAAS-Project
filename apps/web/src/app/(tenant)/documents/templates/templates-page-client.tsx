'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { useDocumentTemplates, useDeleteDocumentTemplate } from '../../../../modules/documents/hooks/use-documents';
import { usePagination } from '../../../../hooks/use-pagination';
import { DocumentStatusBadge } from '../../../../modules/documents/components/document-status-badge';
import { ROUTES } from '../../../../constants/routes.constants';

interface TemplatesPageClientProps {
  title: string;
  description: string;
}

export function TemplatesPageClient({ title, description }: TemplatesPageClientProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const { page, pageSize, goToPage: setPage } = usePagination();

  const { data, isLoading } = useDocumentTemplates({
    page,
    pageSize,
    search: search || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const deleteTemplate = useDeleteDocumentTemplate();

  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;
  const templates = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.documents'), href: ROUTES.TENANT.DOCUMENTS.ROOT },
          { label: title },
        ]}
        actions={
          <Link
            href={ROUTES.TENANT.DOCUMENTS.TEMPLATE_NEW}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white hover:bg-brand-blue-500 transition-colors"
          >
            + {t('documents.templates.createButton')}
          </Link>
        }
      />

      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('documents.templates.searchPlaceholder')}
          className="w-full rounded-md border border-border-default bg-surface-primary py-2 pl-4 pr-10 text-body-md placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20"
        />
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0z" />
        </svg>
      </div>

      {!isLoading && (
        <p className="text-body-sm text-text-secondary">
          {t('pagination.showing', {
            from: Math.min((page - 1) * pageSize + 1, total),
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border-default bg-surface-primary divide-y divide-border-default">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-canvas" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-canvas" />
              <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-surface-canvas" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-primary px-6 py-12 text-center">
          <p className="text-body-md font-medium text-text-primary">
            {t('documents.templates.empty.title')}
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">
            {t('documents.templates.empty.description')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary">
          {/* Inner scroller. Without it the parent's overflow-hidden hard-clips
              the trailing columns — including Delete — with no way to reach them
              on a phone. */}
          <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-canvas">
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.name')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.type')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.required')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.expiry')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.status')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                  {t('documents.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {templates.map((tmpl) => (
                <tr key={tmpl.id} className="hover:bg-surface-canvas transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link
                      href={ROUTES.TENANT.DOCUMENTS.TEMPLATE_DETAIL(tmpl.id)}
                      className="hover:text-brand-blue-600 transition-colors"
                    >
                      {tmpl.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{tmpl.type}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {tmpl.isRequired ? t('common.required') : t('common.optional')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {tmpl.expiryMonths ? `${tmpl.expiryMonths} mo` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge status={tmpl.isActive ? 'ACTIVE' : 'EXPIRED'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={ROUTES.TENANT.DOCUMENTS.TEMPLATE_DETAIL(tmpl.id)}
                        className="inline-flex h-11 items-center px-2 text-brand-blue-600 hover:underline"
                      >
                        {t('common.view')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('common.confirmDelete'))) {
                            deleteTemplate.mutate(tmpl.id);
                          }
                        }}
                        className="inline-flex h-11 items-center px-2 text-semantic-danger hover:underline"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.previousPage')}
          >←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
            aria-label={t('pagination.nextPage')}
          >→</button>
        </div>
      )}
    </div>
  );
}
