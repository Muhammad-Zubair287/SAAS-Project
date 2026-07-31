'use client';

import { useTranslations } from 'next-intl';
import type { EmployeeDocument } from '../types/documents.types';
import { DocumentStatusBadge } from './document-status-badge';

interface EmployeeDocumentsTableProps {
  data: EmployeeDocument[];
  isLoading?: boolean;
}

export function EmployeeDocumentsTable({
  data,
  isLoading = false,
}: EmployeeDocumentsTableProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary">
        <div className="divide-y divide-border-default">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-canvas" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-canvas" />
              <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-surface-canvas" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary px-6 py-12 text-center">
        <p className="text-body-md font-medium text-text-primary">
          {t('documents.templates.empty.title')}
        </p>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t('documents.templates.empty.description')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-canvas">
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">
              {t('documents.columns.name')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">
              {t('documents.columns.type')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">
              {t('documents.columns.expiry')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">
              {t('documents.columns.status')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {data.map((doc) => (
            <tr key={doc.id} className="hover:bg-surface-canvas transition-colors">
              <td className="px-4 py-3 font-medium text-text-primary">{doc.title}</td>
              <td className="px-4 py-3 text-text-secondary">{doc.documentType}</td>
              <td className="px-4 py-3 text-text-secondary">
                {doc.expiryDate ?? '—'}
              </td>
              <td className="px-4 py-3">
                <DocumentStatusBadge status={doc.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
