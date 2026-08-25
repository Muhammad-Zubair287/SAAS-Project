'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { PermissionGate } from '../../../lib/permissions/permission-gate';
import { useAllSupportGrants, useTenants } from '../../../modules/platform/hooks/use-tenants';
import { useRevokeSupportGrant, useApproveSupportGrant, useRejectSupportGrant } from '../../../modules/platform/hooks/use-tenant-mutations';
import { usePagination } from '../../../hooks/use-pagination';
import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import type { SupportGrant } from '../../../modules/platform/types/platform.types';

interface SupportPageClientProps {
  title: string;
  description: string;
}

const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-semantic-success',
  PENDING: 'bg-amber-50 text-amber-700',
  REVOKED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-50 text-red-700',
};

function RejectDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const t = useTranslations();
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={t('platform.support.reject.title')}
      description={t('platform.support.reject.description')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" isLoading={isPending} onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}>
            {t('platform.support.reject.confirm')}
          </Button>
        </>
      }
    >
      <div>
        <label htmlFor="reject-reason" className="block text-label-md font-medium text-text-primary">{t('platform.support.reject.reason')}</label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          className="mt-1 w-full rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-600 resize-none"
        />
      </div>
    </Dialog>
  );
}

function SupportGrantRow({ grant, tenantName }: { grant: SupportGrant; tenantName: string }) {
  const t = useTranslations();
  const revoke = useRevokeSupportGrant(grant.tenantId);
  const approve = useApproveSupportGrant();
  const reject = useRejectSupportGrant();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const statusCls = STATUS_CLASSES[grant.status] ?? 'bg-surface-canvas text-text-secondary';

  const handleApprove = async () => {
    await approve.mutateAsync({ grantId: grant.id, payload: {} });
  };

  const handleReject = async (reason: string) => {
    await reject.mutateAsync({ grantId: grant.id, payload: { reason } });
    setRejectOpen(false);
  };

  return (
    <>
      <div className="rounded-xl border border-border-default bg-surface-primary p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href={ROUTES.PLATFORM.TENANT_DETAIL(grant.tenantId)} className="text-body-md font-semibold text-brand-blue-600 hover:underline">{tenantName}</Link>
            <p className="mt-1 text-body-md text-text-primary">{grant.reason}</p>
            <p className="mt-1 text-body-sm text-text-secondary">
              {new Date(grant.startsAt).toLocaleString()} → {new Date(grant.endsAt).toLocaleString()}
            </p>
            <p className="mt-1 text-caption text-text-secondary">{t('platform.tenants.support.scope')}: {grant.scope.join(', ')}</p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-label-md font-semibold ${statusCls}`}>{grant.status}</span>

            {grant.status === 'PENDING' && (
              <PermissionGate permission={PLATFORM_PERMISSIONS.SUPPORT_APPROVE}>
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={approve.isPending}
                    onClick={() => void handleApprove()}
                  >
                    {t('platform.support.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRejectOpen(true)}
                  >
                    {t('platform.support.reject.label')}
                  </Button>
                </>
              </PermissionGate>
            )}

            {grant.status === 'ACTIVE' && !confirmRevoke && (
              <PermissionGate permission={PLATFORM_PERMISSIONS.SUPPORT_REVOKE}>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  className="rounded-md border border-semantic-danger px-3 py-1.5 text-body-sm font-medium text-semantic-danger hover:bg-red-50"
                >
                  {t('platform.support.revoke')}
                </button>
              </PermissionGate>
            )}

            {grant.status === 'ACTIVE' && confirmRevoke && (
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() =>
                  void revoke
                    .mutateAsync({ grantId: grant.id, payload: { reason: 'Revoked from platform support access screen' } })
                    .then(() => setConfirmRevoke(false))
                }
                className="rounded-md bg-semantic-danger px-3 py-1.5 text-body-sm font-semibold text-white disabled:opacity-50"
              >
                {t('platform.support.confirmRevoke')}
              </button>
            )}
          </div>
        </div>
      </div>

      <RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => void handleReject(reason)}
        isPending={reject.isPending}
      />
    </>
  );
}

export function SupportPageClient({ title, description }: SupportPageClientProps) {
  const t = useTranslations();
  const { page, pageSize, goToPage: setPage } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch } = useAllSupportGrants({ page, pageSize, status: statusFilter || undefined });
  const { data: tenantsData } = useTenants({ page: 1, pageSize: 100 });

  const tenantNames = new Map((tenantsData?.data ?? []).map((t) => [t.id, t.displayName]));
  const totalPages = data?.meta.totalPages ?? 1;

  const pendingCount = (data?.data ?? []).filter((g) => g.status === 'PENDING').length;
  const activeCount = (data?.data ?? []).filter((g) => g.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('platform.nav.overview'), href: ROUTES.PLATFORM.DASHBOARD },
          { label: title },
        ]}
      />

      {/* Summary */}
      {!isLoading && !isError && data?.data && data.data.length > 0 && (
        <div className="flex flex-wrap gap-4 text-body-sm">
          <span className="rounded-full bg-green-50 px-3 py-1 text-semantic-success font-medium">
            {t('platform.support.status.active')}: {activeCount}
          </span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 font-medium">
              {t('platform.support.status.pending')}: {pendingCount}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
        >
          <option value="">{t('platform.support.filters.allStatuses')}</option>
          <option value="PENDING">{t('platform.support.status.pending')}</option>
          <option value="ACTIVE">{t('platform.support.status.active')}</option>
          <option value="REVOKED">{t('platform.support.status.revoked')}</option>
          <option value="EXPIRED">{t('platform.support.status.expired')}</option>
          <option value="REJECTED">{t('platform.support.status.rejected')}</option>
        </select>
      </div>

      {isLoading && <div className="flex justify-center p-12"><LoadingSpinner /></div>}
      {isError && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
          <p className="text-body-md text-text-secondary">{t('common.error')}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 text-body-sm font-medium text-brand-blue-600">{t('common.retry')}</button>
        </div>
      )}

      {!isLoading && !isError && (data?.data ?? []).length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-body-md text-text-secondary">
          {t('platform.support.empty')}
        </div>
      )}

      {!isLoading && !isError && (data?.data ?? []).length > 0 && (
        <div className="space-y-3">
          {(data?.data ?? []).map((grant) => (
            <SupportGrantRow
              key={grant.id}
              grant={grant}
              tenantName={tenantNames.get(grant.tenantId) ?? grant.tenantId.slice(0, 8)}
            />
          ))}
        </div>
      )}

      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-border-default px-3 py-2 text-body-sm disabled:opacity-40">←</button>
          <span className="text-body-sm text-text-secondary">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-border-default px-3 py-2 text-body-sm disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
