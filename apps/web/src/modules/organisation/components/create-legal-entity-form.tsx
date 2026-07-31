'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateLegalEntity } from '../hooks/use-legal-entities';
import { ROUTES } from '../../../constants/routes.constants';
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES, SUPPORTED_TIMEZONES } from '../constants/organisation.constants';
import type { CreateLegalEntityPayload } from '../types/organisation.types';

const INITIAL: CreateLegalEntityPayload = {
  name: '',
  registrationNumber: '',
  countryCode: 'PK',
  currencyCode: 'PKR',
  timezone: 'Asia/Karachi',
  isPrimary: false,
};

export function CreateLegalEntityForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateLegalEntity();
  const [form, setForm] = useState<CreateLegalEntityPayload>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreateLegalEntityPayload>(key: K, value: CreateLegalEntityPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await create.mutateAsync({
        ...form,
        registrationNumber: form.registrationNumber || undefined,
      });
      router.push(ROUTES.TENANT.ORGANISATION.LEGAL_ENTITY_DETAIL(result.data.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.generic');
      setError(msg);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h2 font-semibold text-text-primary">
          {t('organisation.legalEntities.create.sectionDetails')}
        </h2>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.legalEntities.fields.name')} <span className="text-semantic-danger">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            placeholder={t('organisation.legalEntities.fields.namePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.legalEntities.fields.registrationNumber')}
          </label>
          <input
            type="text"
            maxLength={100}
            value={form.registrationNumber ?? ''}
            onChange={(e) => update('registrationNumber', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            placeholder={t('organisation.legalEntities.fields.registrationNumberPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.legalEntities.fields.country')} <span className="text-semantic-danger">*</span>
            </label>
            <select
              required
              value={form.countryCode}
              onChange={(e) => update('countryCode', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.legalEntities.fields.currency')} <span className="text-semantic-danger">*</span>
            </label>
            <select
              required
              value={form.currencyCode}
              onChange={(e) => update('currencyCode', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.legalEntities.fields.timezone')} <span className="text-semantic-danger">*</span>
          </label>
          <select
            required
            value={form.timezone}
            onChange={(e) => update('timezone', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
          >
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPrimary"
            checked={form.isPrimary ?? false}
            onChange={(e) => update('isPrimary', e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus:ring-brand-blue-600"
          />
          <label htmlFor="isPrimary" className="text-body-md text-text-primary cursor-pointer">
            {t('organisation.legalEntities.fields.isPrimary')}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors"
        >
          {create.isPending ? t('common.loading') : t('organisation.legalEntities.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
