/** Live Prisma plan.billing_model values (schema comment). */
export const PLAN_BILLING_MODELS = ['FLAT_RATE', 'PER_SEAT', 'USAGE'] as const;

/** Operational plan catalogue statuses used by the live schema. */
export const PLAN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const ENTERPRISE_FEATURE_CODES = new Set([
  'feature_sso',
  'feature_api_access',
  'feature_dedicated_support',
  'feature_custom_branding',
  'feature_on_prem_connector',
  'feature_webhooks',
]);

export type EntitlementFormGroup = 'modules' | 'enterprise' | 'limits' | 'other';

export function classifyEntitlementGroup(code: string, dataType: string): EntitlementFormGroup {
  if (dataType === 'BOOLEAN' && code.startsWith('feature_') && !ENTERPRISE_FEATURE_CODES.has(code)) {
    return 'modules';
  }
  if (dataType === 'BOOLEAN' && ENTERPRISE_FEATURE_CODES.has(code)) {
    return 'enterprise';
  }
  if (dataType === 'INTEGER' || dataType === 'DECIMAL') {
    return 'limits';
  }
  return 'other';
}

export function initialEntitlementValue(dataType: string, defaultValue: unknown): unknown {
  switch (dataType) {
    case 'BOOLEAN':
      return defaultValue === true || defaultValue === 'true' || defaultValue === 1;
    case 'INTEGER':
    case 'DECIMAL':
      return typeof defaultValue === 'number' ? defaultValue : Number(defaultValue ?? 0);
    case 'STRING':
      return typeof defaultValue === 'string' ? defaultValue : String(defaultValue ?? '');
    default:
      return defaultValue;
  }
}

/** Coerce form state into API-safe entitlement values (matches server validation). */
export function coerceEntitlementFormValue(dataType: string, value: unknown): unknown {
  switch (dataType) {
    case 'BOOLEAN':
      return value === true || value === 'true' || value === 1;
    case 'INTEGER': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isInteger(numeric)) {
        throw new Error(`Invalid INTEGER entitlement value: ${String(value)}`);
      }
      return numeric;
    }
    case 'DECIMAL': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error(`Invalid DECIMAL entitlement value: ${String(value)}`);
      }
      return numeric;
    }
    case 'STRING':
      return typeof value === 'string' ? value : String(value ?? '');
    default:
      return value;
  }
}

export function buildEntitlementSubmitPayload(
  catalogue: Array<{ id: string; dataType: string; defaultValue: unknown }>,
  values: Record<string, unknown>,
): Array<{ entitlementId: string; defaultValue: unknown }> {
  return catalogue.map((item) => {
    const raw =
      values[item.id] !== undefined
        ? values[item.id]
        : initialEntitlementValue(item.dataType, item.defaultValue);
    return {
      entitlementId: item.id,
      defaultValue: coerceEntitlementFormValue(item.dataType, raw),
    };
  });
}
