'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { EmptyState } from '../../../../components/feedback/empty-state';
import { tenantAdminApi } from '../../../../modules/tenant/api/tenant-admin-api';
import {
  tenantAdminKeys,
  useTenantSessions,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

export default function SessionsSettingsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { data, isLoading } = useTenantSessions();

  const revoke = useMutation({
    mutationFn: (id: string) => tenantAdminApi.revokeSession(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: tenantAdminKeys.sessions() }),
  });
  const revokeAll = useMutation({
    mutationFn: () => tenantAdminApi.revokeAllSessions(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: tenantAdminKeys.sessions() }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.sessions.title')}
        description={t('tenant.settings.sessions.description')}
      />
      <button
        type="button"
        className="rounded-md border border-status-danger px-3 py-1.5 text-status-danger"
        disabled={revokeAll.isPending || rows.length === 0}
        onClick={() => {
          if (confirm(t('tenant.settings.sessions.revokeAll'))) {
            void revokeAll.mutateAsync();
          }
        }}
      >
        {t('tenant.settings.sessions.revokeAll')}
      </button>
      {rows.length === 0 ? (
        <EmptyState title={t('tenant.settings.sessions.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="min-w-full text-left text-body-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Signed in</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-border-default">
                  <td className="px-3 py-2">
                    {s.displayName}
                    <div className="text-caption text-text-secondary">{s.email}</div>
                  </td>
                  <td className="px-3 py-2">{s.userAgent ?? '—'}</td>
                  <td className="px-3 py-2">{s.ipAddress ?? '—'}</td>
                  <td className="px-3 py-2">{new Date(s.signedInAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-status-danger"
                      onClick={() => void revoke.mutateAsync(s.id)}
                    >
                      {t('tenant.settings.sessions.revoke')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
