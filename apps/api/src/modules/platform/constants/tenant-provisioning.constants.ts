/** Canonical industry codes for tenant company profile (localisation keys: platform.catalogue.industries.{code}). */
export const INDUSTRY_CODES = [
  'technology',
  'manufacturing',
  'retail',
  'healthcare',
  'education',
  'financial_services',
  'logistics',
  'professional_services',
  'other',
] as const;

export type IndustryCode = (typeof INDUSTRY_CODES)[number];

/** Employee size bands from UX spec SCR-PLT-03. */
export const EMPLOYEE_SIZE_BANDS = ['1-50', '51-200', '201-500', '501-1000', '1000+'] as const;

export type EmployeeSizeBand = (typeof EMPLOYEE_SIZE_BANDS)[number];

export const SUPPORT_TIER_VALUES = ['standard', 'premium', 'enterprise'] as const;

export type SupportTier = (typeof SUPPORT_TIER_VALUES)[number];

/** Entitlement codes that are always enabled and cannot be toggled off at provisioning. */
export const ALWAYS_ENABLED_ENTITLEMENTS = new Set([
  'feature_core_hr',
  'feature_attendance',
  'feature_leave',
]);

/** Maps support tier selection to dedicated support entitlement value. */
export const SUPPORT_TIER_DEDICATED_MAP: Record<SupportTier, boolean> = {
  standard: false,
  premium: false,
  enterprise: true,
};
