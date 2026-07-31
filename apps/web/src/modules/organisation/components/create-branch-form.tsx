'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateBranch } from '../hooks/use-branches';
import { useLegalEntities } from '../hooks/use-legal-entities';
import { ROUTES } from '../../../constants/routes.constants';
import { SUPPORTED_COUNTRIES, SUPPORTED_TIMEZONES } from '../constants/organisation.constants';
import type { CreateBranchPayload } from '../types/organisation.types';

const INITIAL: CreateBranchPayload = {
  legalEntityId: '',
  name: '',
  code: '',
  countryCode: 'PK',
  timezone: 'Asia/Karachi',
  isHeadOffice: false,
};

export function CreateBranchForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateBranch();
  const { data: leData } = useLegalEntities();
  const [form, setForm] = useState<CreateBranchPayload>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreateBranchPayload>(key: K, value: CreateBranchPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await create.mutateAsync(form);
      router.push(ROUTES.TENANT.ORGANISATION.BRANCH_DETAIL(result.data.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  const legalEntities = leData?.data ?? [];

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">{error}</div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h2 font-semibold text-text-primary">
          {t('organisation.branches.create.sectionDetails')}
        </h2>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.branches.fields.legalEntity')} <span className="text-semantic-danger">*</span>
          </label>
          <select
            required
            value={form.legalEntityId}
            onChange={(e) => update('legalEntityId', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
          >
            <option value="">{t('organisation.branches.fields.legalEntityPlaceholder')}</option>
            {legalEntities.map((le) => (
              <option key={le.id} value={le.id}>{le.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.branches.fields.name')} <span className="text-semantic-danger">*</span>
            </label>
            <input
              type="text" required maxLength={200}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            />
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.branches.fields.code')} <span className="text-semantic-danger">*</span>
            </label>
            <input
              type="text" required maxLength={40}
              value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 font-mono text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.branches.fields.country')} <span className="text-semantic-danger">*</span>
            </label>
            <select required value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
              {SUPPORTED_COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.branches.fields.timezone')} <span className="text-semantic-danger">*</span>
            </label>
            <select required value={form.timezone} onChange={(e) => update('timezone', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
              {SUPPORTED_TIMEZONES.map((tz) => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.branches.fields.city')}
          </label>
          <input type="text" maxLength={100} value={form.city ?? ''} onChange={(e) => update('city', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="isHeadOffice" checked={form.isHeadOffice ?? false}
            onChange={(e) => update('isHeadOffice', e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus:ring-brand-blue-600" />
          <label htmlFor="isHeadOffice" className="text-body-md text-text-primary cursor-pointer">
            {t('organisation.branches.fields.isHeadOffice')}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={create.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors">
          {create.isPending ? t('common.loading') : t('organisation.branches.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
