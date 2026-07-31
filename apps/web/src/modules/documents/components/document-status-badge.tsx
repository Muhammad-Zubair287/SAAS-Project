'use client';

import { useTranslations } from 'next-intl';
import type {
  DocumentStatus,
  DocumentRequestStatus,
  OnboardingStatus,
  OnboardingTaskStatus,
  DocumentRequestItemStatus,
  EsignStatus,
} from '../types/documents.types';

type AnyDocumentStatus =
  | DocumentStatus
  | DocumentRequestStatus
  | OnboardingStatus
  | OnboardingTaskStatus
  | DocumentRequestItemStatus
  | EsignStatus;

const STATUS_STYLES: Record<string, string> = {
  PENDING:     'bg-yellow-50 text-yellow-700 ring-yellow-200',
  ACTIVE:      'bg-green-50 text-green-700 ring-green-200',
  EXPIRED:     'bg-red-50 text-red-700 ring-red-200',
  REJECTED:    'bg-red-50 text-red-700 ring-red-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED:   'bg-green-50 text-green-700 ring-green-200',
  CANCELLED:   'bg-gray-50 text-gray-600 ring-gray-200',
  PARTIAL:     'bg-orange-50 text-orange-700 ring-orange-200',
  SUBMITTED:   'bg-blue-50 text-blue-700 ring-blue-200',
  APPROVED:    'bg-green-50 text-green-700 ring-green-200',
  SKIPPED:     'bg-gray-50 text-gray-600 ring-gray-200',
  SIGNED:      'bg-green-50 text-green-700 ring-green-200',
  DECLINED:    'bg-red-50 text-red-700 ring-red-200',
};

interface DocumentStatusBadgeProps {
  status: AnyDocumentStatus;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const t = useTranslations();
  const style = STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-600 ring-gray-200';

  const label = (() => {
    try {
      return t(`documents.status.${status}` as Parameters<typeof t>[0]);
    } catch {
      return status;
    }
  })();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
