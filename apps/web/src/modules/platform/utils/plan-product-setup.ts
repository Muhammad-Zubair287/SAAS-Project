import type { PlanEntitlement } from '../types/platform.types';

const SSO_CODE = 'feature_sso';
const API_ACCESS_CODE = 'feature_api_access';
const DEDICATED_SUPPORT_CODE = 'feature_dedicated_support';

const SEPARATE_PRODUCT_CODES = new Set([SSO_CODE, API_ACCESS_CODE, DEDICATED_SUPPORT_CODE]);

export function isEntitlementIncluded(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function formatEntitlementValue(
  entitlement: PlanEntitlement,
  labels: { included: string; notIncluded: string },
): string {
  const value = entitlement.defaultValue;
  const booleanLike =
    entitlement.dataType === 'BOOLEAN' || typeof value === 'boolean' || value === 'true' || value === 'false';

  if (booleanLike) {
    return isEntitlementIncluded(value) ? labels.included : labels.notIncluded;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const formatted = value.toLocaleString();
    return entitlement.unit ? `${formatted} ${entitlement.unit}` : formatted;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim() === String(numeric)) {
      const formatted = numeric.toLocaleString();
      return entitlement.unit ? `${formatted} ${entitlement.unit}` : formatted;
    }
    return value;
  }

  if (value == null) return '—';
  return String(value);
}

export interface ProductModuleRow {
  code: string;
  label: string;
  included: boolean;
}

export interface ProductSetupView {
  modules: ProductModuleRow[];
  ssoIncluded: boolean | null;
  apiIncluded: boolean | null;
  dedicatedSupport: boolean | null;
}

function findByCode(entitlements: PlanEntitlement[], code: string): PlanEntitlement | undefined {
  return entitlements.find((row) => row.code === code);
}

/**
 * Plan-derived Product Setup. Module/entitlement values come from the catalogue
 * API — this helper only classifies rows, it does not invent commercial state.
 */
export function deriveProductSetup(entitlements: PlanEntitlement[]): ProductSetupView {
  const modules = entitlements
    .filter((row) => row.code.startsWith('feature_') && !SEPARATE_PRODUCT_CODES.has(row.code))
    .map((row) => ({
      code: row.code,
      label: row.label,
      included: isEntitlementIncluded(row.defaultValue),
    }));

  const sso = findByCode(entitlements, SSO_CODE);
  const api = findByCode(entitlements, API_ACCESS_CODE);
  const support = findByCode(entitlements, DEDICATED_SUPPORT_CODE);

  return {
    modules,
    ssoIncluded: sso ? isEntitlementIncluded(sso.defaultValue) : null,
    apiIncluded: api ? isEntitlementIncluded(api.defaultValue) : null,
    dedicatedSupport: support ? isEntitlementIncluded(support.defaultValue) : null,
  };
}
