'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { tenantAdminApi } from '../../../../modules/tenant/api/tenant-admin-api';
import {
  tenantAdminKeys,
  useDeleteTenantRole,
  usePermissionsCatalogue,
  useTenantRoles,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

export default function RolesSettingsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const roles = useTenantRoles();
  const permissions = usePermissionsCatalogue();
  const deleteRole = useDeleteTenantRole();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const selected = useMemo(
    () => (roles.data?.data ?? []).find((r) => r.id === selectedRoleId) ?? null,
    [roles.data, selectedRoleId],
  );
  const [draftPerms, setDraftPerms] = useState<string[]>([]);

  const createRole = useMutation({
    mutationFn: () => tenantAdminApi.createRole({ name: newName, permissionCodes: [] }),
    onSuccess: () => {
      setNewName('');
      void qc.invalidateQueries({ queryKey: tenantAdminKeys.roles() });
    },
  });

  const updateRole = useMutation({
    mutationFn: () =>
      tenantAdminApi.updateRole(selectedRoleId!, { permissionCodes: draftPerms }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: tenantAdminKeys.roles() }),
  });

  if (roles.isLoading || permissions.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const roleRows = roles.data?.data ?? [];
  const permRows = permissions.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenant.settings.roles.title')}
        description={t('tenant.settings.roles.description')}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-md border border-border-default px-3 py-2"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Custom role name"
        />
        <button
          type="button"
          disabled={!newName || createRole.isPending}
          onClick={() => void createRole.mutateAsync()}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {t('tenant.settings.roles.create')}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <ul className="space-y-1 rounded-lg border border-border-default p-2">
          {roleRows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-body-sm ${
                  selectedRoleId === r.id ? 'bg-brand-blue-50 text-brand-blue-700' : ''
                }`}
                onClick={() => {
                  setSelectedRoleId(r.id);
                  setDraftPerms(r.permissions);
                }}
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-caption text-text-secondary">
                  {r.isSystem ? t('tenant.settings.roles.system') : t('tenant.settings.roles.custom')}{' '}
                  · {t('tenant.settings.roles.assignments', { count: r.assignmentCount })}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-border-default p-4">
          {!selected ? (
            <p className="text-body-sm text-text-secondary">Select a role</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-title-sm font-semibold">{selected.name}</h2>
                {!selected.isSystem ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updateRole.isPending}
                      onClick={() => void updateRole.mutateAsync()}
                      className="rounded-md bg-brand-blue-600 px-3 py-1.5 text-white disabled:opacity-60"
                    >
                      Save matrix
                    </button>
                    <button
                      type="button"
                      disabled={deleteRole.isPending}
                      onClick={() => {
                        if (confirm(t('tenant.settings.roles.confirmDelete', { name: selected.name }))) {
                          void deleteRole.mutateAsync(selected.id).then(() => {
                            setSelectedRoleId(null);
                            setDraftPerms([]);
                          });
                        }
                      }}
                      className="rounded-md border border-status-danger px-3 py-1.5 text-status-danger disabled:opacity-60"
                    >
                      {t('tenant.settings.roles.delete')}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="max-h-[480px] space-y-2 overflow-y-auto">
                {permRows.map((p) => {
                  const checked = draftPerms.includes(p.code);
                  return (
                    <label key={p.id} className="flex items-start gap-2 text-body-sm">
                      <input
                        type="checkbox"
                        disabled={selected.isSystem}
                        checked={checked}
                        onChange={(e) => {
                          setDraftPerms((prev) =>
                            e.target.checked
                              ? [...prev, p.code]
                              : prev.filter((c) => c !== p.code),
                          );
                        }}
                      />
                      <span>
                        <span className="font-medium">{p.code}</span>
                        {p.description ? (
                          <span className="block text-caption text-text-secondary">
                            {p.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
