/** Product module and add-on catalogue for tenant provisioning wizard. */
export const PRODUCT_MODULE_CODES = [
  'feature_core_hr',
  'feature_attendance',
  'feature_leave',
  'feature_payroll',
  'feature_taskops',
  'feature_performance',
  'feature_assets',
  'feature_benefits',
  'feature_ai_insights',
  'feature_compliance_packs',
] as const;

export const PRODUCT_ADDON_CODES = [
  'feature_sso',
  'feature_api_access',
  'feature_webhooks',
  'feature_on_prem_connector',
  'feature_custom_fields',
  'feature_advanced_reports',
] as const;

export const ALWAYS_ENABLED_MODULE_CODES = new Set([
  'feature_core_hr',
  'feature_attendance',
  'feature_leave',
]);

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

export const EMPLOYEE_SIZE_BANDS = ['1-50', '51-200', '201-500', '501-1000', '1000+'] as const;

export const SUPPORT_TIER_VALUES = ['standard', 'premium', 'enterprise'] as const;

export type SupportTier = (typeof SUPPORT_TIER_VALUES)[number];

/** Plan comparison rows — entitlement code per UX spec feature row. */
export const PLAN_COMPARISON_ROWS = [
  { key: 'coreHr', code: 'feature_core_hr' },
  { key: 'attendance', code: 'feature_attendance' },
  { key: 'leave', code: 'feature_leave' },
  { key: 'payroll', code: 'feature_payroll' },
  { key: 'advancedWorkflows', code: 'feature_shifts' },
  { key: 'sso', code: 'feature_sso' },
  { key: 'seatLimit', code: 'max_employees' },
  { key: 'apiAccess', code: 'feature_api_access' },
  { key: 'support', code: 'feature_dedicated_support' },
] as const;

export const PRICING_PER_EMPLOYEE_CODE = 'pricing_per_employee_monthly';
export const PRICING_MINIMUM_FEE_CODE = 'pricing_minimum_platform_fee';
