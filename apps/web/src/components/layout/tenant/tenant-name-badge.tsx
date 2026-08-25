'use client';

import { useTranslations } from 'next-intl';
import { useTenantBranding, useTenantProfile } from '../../../modules/tenant/hooks/use-tenant-admin';

/** Read-only tenant name for header chrome (not a switcher). */
export function TenantNameBadge() {
  const t = useTranslations();
  const { data: brandingData } = useTenantBranding();
  const { data: profileData } = useTenantProfile();

  const name =
    brandingData?.data?.applicationName?.trim() ||
    profileData?.data?.displayName?.trim() ||
    t('tenant.admin.label');

  return (
    <div
      className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-border-default bg-surface-canvas px-2.5 py-1.5 text-body-sm text-text-primary"
      title={name}
    >
      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <span className="truncate">{name}</span>
    </div>
  );
}
