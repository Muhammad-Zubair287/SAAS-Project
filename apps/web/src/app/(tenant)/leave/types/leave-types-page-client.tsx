'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { Dialog } from '../../../../components/ui/dialog';
import { ROUTES } from '../../../../constants/routes.constants';
import {
  useCreateLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from '../../../../modules/leave/hooks/use-leave';
import type { LeaveType } from '../../../../modules/leave/types/leave.types';

type LeaveTypeForm = {
  code: string;
  name: string;
  paidStatus: 'PAID' | 'UNPAID' | 'MIXED';
  unit: 'DAY' | 'HOUR';
  halfDayAllowed: boolean;
};

const EMPTY_FORM: LeaveTypeForm = {
  code: '',
  name: '',
  paidStatus: 'PAID',
  unit: 'DAY',
  halfDayAllowed: false,
};

export function LeaveTypesPageClient() {
  const t = useTranslations('tenant.leave');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const types = useLeaveTypes();
  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(EMPTY_FORM);

  const rows = types.data?.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(row: LeaveType) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      paidStatus: row.paidStatus,
      unit: row.unit,
      halfDayAllowed: row.halfDayAllowed,
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        payload: {
          name: form.name,
          paidStatus: form.paidStatus,
          unit: form.unit,
          halfDayAllowed: form.halfDayAllowed,
        },
      });
    } else {
      await create.mutateAsync(form);
    }
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('types.title')}
        description={t('types.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('leave'), href: ROUTES.TENANT.LEAVE.ROOT },
          { label: t('types.title') },
        ]}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-semibold text-white"
          >
            {t('types.create')}
          </button>
        }
      />
      {types.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-canvas">
                <th className="px-4 py-3 text-left">{t('types.columns.code')}</th>
                <th className="px-4 py-3 text-left">{t('types.columns.name')}</th>
                <th className="px-4 py-3 text-left">{t('types.columns.paidStatus')}</th>
                <th className="px-4 py-3 text-left">{t('types.columns.unit')}</th>
                <th className="px-4 py-3 text-left">{t('types.columns.status')}</th>
                <th className="px-4 py-3 text-left">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    {t('types.empty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.paidStatus}</td>
                    <td className="px-4 py-3">{row.unit}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-brand-blue-600 hover:underline"
                      >
                        {tc('edit')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title={editing ? t('types.edit') : t('types.create')}>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {!editing && (
            <label className="block">
              <span className="mb-1 block text-label-md font-semibold">{t('types.columns.code')}</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded-md border border-border-default px-3 py-2"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">{t('types.columns.name')}</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-border-default px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">
              {t('types.columns.paidStatus')}
            </span>
            <select
              value={form.paidStatus}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paidStatus: e.target.value as 'PAID' | 'UNPAID' | 'MIXED',
                }))
              }
              className="w-full rounded-md border border-border-default px-3 py-2"
            >
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID</option>
              <option value="MIXED">MIXED</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md font-semibold">{t('types.columns.unit')}</span>
            <select
              value={form.unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit: e.target.value as 'DAY' | 'HOUR' }))
              }
              className="w-full rounded-md border border-border-default px-3 py-2"
            >
              <option value="DAY">DAY</option>
              <option value="HOUR">HOUR</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.halfDayAllowed}
              onChange={(e) => setForm((f) => ({ ...f, halfDayAllowed: e.target.checked }))}
            />
            <span className="text-body-sm">{t('types.halfDayAllowed')}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border-default px-4 py-2"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {tc('save')}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
