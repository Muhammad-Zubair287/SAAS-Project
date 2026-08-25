'use client';

import { useTranslations } from 'next-intl';
import type { PlanEntitlement } from '../types/platform.types';
import { deriveProductSetup } from '../utils/plan-product-setup';

interface ProductSetupSummaryProps {
  planName?: string;
  entitlements: PlanEntitlement[];
  regionName?: string;
}

function inclusionLabel(value: boolean | null, included: string, notIncluded: string): string {
  if (value == null) return '—';
  return value ? included : notIncluded;
}

export function ProductSetupSummary({ planName, entitlements, regionName }: ProductSetupSummaryProps) {
  const t = useTranslations();
  const setup = deriveProductSetup(entitlements);
  const included = t('platform.tenants.create.product.included');
  const notIncluded = t('platform.tenants.create.product.notIncluded');
  const supportTier =
    setup.dedicatedSupport == null
      ? '—'
      : setup.dedicatedSupport
        ? t('platform.tenants.create.product.supportPremium')
        : t('platform.tenants.create.product.supportStandard');

  return (
    <div className="space-y-4">
      {regionName && (
        <div>
          <h4 className="text-label-md font-semibold text-text-primary">{t('platform.tenants.create.company.hostingRegion')}</h4>
          <p className="mt-1 text-body-sm text-text-primary">{regionName}</p>
        </div>
      )}

      <div>
        <h4 className="text-label-md font-semibold text-text-primary">{t('platform.tenants.create.product.enabledModules')}</h4>
        {setup.modules.length === 0 ? (
          <p className="mt-1 text-body-sm text-text-secondary">{t('platform.tenants.create.product.noEntitlements')}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {setup.modules.map((mod) => (
              <li key={mod.code} className="flex justify-between gap-3 text-body-sm">
                <span className="text-text-secondary">{mod.label}</span>
                <span className="font-medium text-text-primary">{mod.included ? included : notIncluded}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-label-md font-semibold text-text-primary">{t('platform.tenants.create.product.entitlements')}</h4>
        <dl className="mt-2 space-y-1">
          <div className="flex justify-between gap-3 text-body-sm">
            <dt className="text-text-secondary">{t('platform.tenants.create.product.sso')}</dt>
            <dd className="font-medium text-text-primary">{inclusionLabel(setup.ssoIncluded, included, notIncluded)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-body-sm">
            <dt className="text-text-secondary">{t('platform.tenants.create.product.apiAccess')}</dt>
            <dd className="font-medium text-text-primary">{inclusionLabel(setup.apiIncluded, included, notIncluded)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-body-sm">
            <dt className="text-text-secondary">{t('platform.tenants.create.product.supportTier')}</dt>
            <dd className="font-medium text-text-primary">{supportTier}</dd>
          </div>
        </dl>
      </div>

      {planName && (
        <p className="text-caption text-text-secondary">
          {t('platform.tenants.create.product.source')}: <span className="font-medium text-text-primary">{planName}</span>
        </p>
      )}
    </div>
  );
}
