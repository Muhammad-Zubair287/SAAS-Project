'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import {
  useTenantBranding,
  useUploadTenantLogo,
  useUpsertTenantBranding,
} from '../../../../modules/tenant/hooks/use-tenant-admin';

const LOGO_UPLOADS = [
  { kind: 'logo', field: 'logoUrl', label: 'Logo' },
  { kind: 'loginLogo', field: 'loginLogoUrl', label: 'Login logo' },
  { kind: 'favicon', field: 'faviconUrl', label: 'Favicon' },
] as const;

function toUploadPath(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return url;
  const uploadIndex = url.indexOf('/uploads/');
  return uploadIndex >= 0 ? url.slice(uploadIndex) : url;
}

export default function BrandingSettingsPage() {
  const t = useTranslations();
  const { data, isLoading } = useTenantBranding();
  const mutation = useUpsertTenantBranding();
  const uploadLogo = useUploadTenantLogo();
  const form = useForm({
    defaultValues: {
      logoUrl: '',
      loginLogoUrl: '',
      faviconUrl: '',
      primaryColor: '#0F766E',
      secondaryColor: '#134E4A',
      applicationName: '',
      emailSenderName: '',
    },
  });

  useEffect(() => {
    const b = data?.data;
    if (!b) return;
    form.reset({
      logoUrl: toUploadPath(b.logoUrl),
      loginLogoUrl: toUploadPath(b.loginLogoUrl),
      faviconUrl: toUploadPath(b.faviconUrl),
      primaryColor: b.primaryColor ?? '#0F766E',
      secondaryColor: b.secondaryColor ?? '#134E4A',
      applicationName: b.applicationName ?? '',
      emailSenderName: b.emailSenderName ?? '',
    });
  }, [data, form]);

  const values = form.watch();
  const handleLogoUpload = async (
    file: File | undefined,
    kind: 'logo' | 'loginLogo' | 'favicon',
    field: 'logoUrl' | 'loginLogoUrl' | 'faviconUrl',
  ) => {
    if (!file) return;
    const result = await uploadLogo.mutateAsync({ file, kind });
    const branding = result.data;
    const nextUrl =
      field === 'logoUrl'
        ? branding.logoUrl
        : field === 'loginLogoUrl'
          ? branding.loginLogoUrl
          : branding.faviconUrl;
    form.setValue(field, toUploadPath(nextUrl), { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('tenant.settings.branding.title')}
        description={t('tenant.settings.branding.description')}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-lg border border-border-default bg-surface-card p-4"
          onSubmit={form.handleSubmit(async (v) => {
            await mutation.mutateAsync(v);
          })}
        >
          {(
            [
              'logoUrl',
              'loginLogoUrl',
              'faviconUrl',
              'primaryColor',
              'secondaryColor',
              'applicationName',
              'emailSenderName',
            ] as const
          ).map((name) => (
            <label key={name} className="block space-y-1">
              <span className="text-body-sm font-medium">{name}</span>
              <input
                className="w-full rounded-md border border-border-default px-3 py-2"
                {...form.register(name)}
              />
            </label>
          ))}
          <div className="space-y-3 rounded-md border border-dashed border-border-default p-3">
            <p className="text-body-sm font-medium">{t('tenant.settings.branding.uploads')}</p>
            {LOGO_UPLOADS.map(({ kind, field, label }) => (
              <label key={kind} className="block space-y-1">
                <span className="text-body-sm font-medium">{label}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-md border border-border-default px-3 py-2"
                  disabled={uploadLogo.isPending}
                  onChange={(e) => {
                    void handleLogoUpload(e.target.files?.[0], kind, field);
                    e.target.value = '';
                  }}
                />
              </label>
            ))}
            {uploadLogo.isPending ? (
              <p className="text-caption text-text-secondary">{t('tenant.settings.branding.uploading')}</p>
            ) : null}
          </div>
          {(data?.data?.contrastWarnings ?? []).map((w) => (
            <p key={w} className="text-caption text-status-warning">
              {t('tenant.settings.branding.contrastWarning')}: {w}
            </p>
          ))}
          {mutation.isSuccess ? (
            <p className="text-body-sm text-status-success">{t('tenant.settings.branding.saved')}</p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {t('tenant.settings.branding.save')}
          </button>
        </form>
        <div className="space-y-4">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: values.primaryColor, background: '#fff' }}
          >
            <p className="text-caption text-text-secondary">
              {t('tenant.settings.branding.previewLogin')}
            </p>
            {values.loginLogoUrl ? (
              <img
                src={toUploadPath(values.loginLogoUrl)}
                alt=""
                className="mt-3 max-h-16 max-w-48 object-contain"
              />
            ) : null}
            <p className="mt-2 text-title-md font-bold" style={{ color: values.primaryColor }}>
              {values.applicationName || 'Workforce OS'}
            </p>
          </div>
          <div className="rounded-lg border border-border-default p-4" style={{ background: values.primaryColor }}>
            <p className="text-caption text-white/80">{t('tenant.settings.branding.previewEmail')}</p>
            {values.logoUrl ? (
              <img
                src={toUploadPath(values.logoUrl)}
                alt=""
                className="mt-3 max-h-12 max-w-40 object-contain"
              />
            ) : null}
            <p className="text-body-md font-semibold text-white">
              {values.emailSenderName || values.applicationName || 'Workforce OS'}
            </p>
          </div>
          <div className="rounded-lg border border-border-default p-4">
            <p className="text-caption text-text-secondary">
              {t('tenant.settings.branding.previewPayslip')}
            </p>
            {values.faviconUrl ? (
              <img
                src={toUploadPath(values.faviconUrl)}
                alt=""
                className="mt-3 h-8 w-8 object-contain"
              />
            ) : null}
            <p className="font-semibold" style={{ color: values.secondaryColor }}>
              {values.applicationName || 'Workforce OS'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
