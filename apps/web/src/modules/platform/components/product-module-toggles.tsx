'use client';

import { useTranslations } from 'next-intl';
import type { PlanEntitlement } from '../types/platform.types';
import {
  ALWAYS_ENABLED_MODULE_CODES,
  PRODUCT_ADDON_CODES,
  PRODUCT_MODULE_CODES,
} from '../constants/create-tenant.constants';
import { isEntitlementIncluded } from '../utils/plan-pricing';

export type ModuleToggleState = Record<string, boolean>;

interface ProductModuleTogglesProps {
  entitlements: PlanEntitlement[];
  values: ModuleToggleState;
  onChange: (code: string, enabled: boolean) => void;
  onRequestUpgrade?: (code: string) => void;
}

function planAllows(code: string, entitlements: PlanEntitlement[]): boolean {
  const row = entitlements.find((e) => e.code === code);
  if (!row) return false;
  return isEntitlementIncluded(row.defaultValue);
}

export function buildDefaultModuleState(entitlements: PlanEntitlement[]): ModuleToggleState {
  const state: ModuleToggleState = {};
  for (const code of [...PRODUCT_MODULE_CODES, ...PRODUCT_ADDON_CODES]) {
    const row = entitlements.find((e) => e.code === code);
    state[code] = row ? isEntitlementIncluded(row.defaultValue) : false;
  }
  for (const code of ALWAYS_ENABLED_MODULE_CODES) {
    state[code] = true;
  }
  return state;
}

export function moduleOverridesFromState(
  state: ModuleToggleState,
  entitlements: PlanEntitlement[],
): Array<{ code: string; value: boolean }> {
  return Object.entries(state)
    .filter(([code, enabled]) => {
      const planDefault = planAllows(code, entitlements);
      return enabled !== planDefault;
    })
    .map(([code, enabled]) => ({ code, value: enabled }));
}

function ToggleRow({
  code,
  label,
  enabled,
  locked,
  planIncluded,
  onChange,
  onRequestUpgrade,
}: {
  code: string;
  label: string;
  enabled: boolean;
  locked: boolean;
  planIncluded: boolean;
  onChange: (code: string, enabled: boolean) => void;
  onRequestUpgrade?: (code: string) => void;
}) {
  const t = useTranslations();
  const unavailable = !planIncluded && !locked;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border-default px-3 py-2">
      <span className="text-body-sm text-text-primary">{label}</span>
      <div className="flex items-center gap-2">
        {unavailable ? (
          <button
            type="button"
            onClick={() => onRequestUpgrade?.(code)}
            className="rounded-md border border-brand-blue-600 px-2 py-1 text-caption font-medium text-brand-blue-600 hover:bg-brand-blue-50"
          >
            {t('tenantAdmin.modules.requestUpgrade')}
          </button>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              disabled={locked}
              onChange={(e) => onChange(code, e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus:ring-brand-blue-600/20 disabled:opacity-60"
            />
            <span className="text-caption text-text-secondary">
              {enabled
                ? t('platform.tenants.create.product.enabled')
                : t('platform.tenants.create.product.disabled')}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

export function ProductModuleToggles({
  entitlements,
  values,
  onChange,
  onRequestUpgrade,
}: ProductModuleTogglesProps) {
  const t = useTranslations();

  const moduleRows = PRODUCT_MODULE_CODES.map((code) => ({
    code,
    label: t(`platform.tenants.create.product.modules.${code}`),
  }));

  const addonRows = PRODUCT_ADDON_CODES.map((code) => ({
    code,
    label: t(`platform.tenants.create.product.addons.${code}`),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-label-md font-semibold text-text-primary">
          {t('platform.tenants.create.product.modulesTitle')}
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {moduleRows.map((row) => (
            <ToggleRow
              key={row.code}
              code={row.code}
              label={row.label}
              enabled={values[row.code] ?? false}
              locked={ALWAYS_ENABLED_MODULE_CODES.has(row.code)}
              planIncluded={planAllows(row.code, entitlements)}
              onChange={onChange}
              onRequestUpgrade={onRequestUpgrade}
            />
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-label-md font-semibold text-text-primary">
          {t('platform.tenants.create.product.addonsTitle')}
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {addonRows.map((row) => (
            <ToggleRow
              key={row.code}
              code={row.code}
              label={row.label}
              enabled={values[row.code] ?? false}
              locked={false}
              planIncluded={planAllows(row.code, entitlements)}
              onChange={onChange}
              onRequestUpgrade={onRequestUpgrade}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
