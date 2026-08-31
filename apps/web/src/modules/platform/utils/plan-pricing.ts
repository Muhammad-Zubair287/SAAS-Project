import type { Plan, PlanEntitlement } from '../types/platform.types';
import {
  PRICING_MINIMUM_FEE_CODE,
  PRICING_PER_EMPLOYEE_CODE,
} from '../constants/create-tenant.constants';

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function findEntitlementValue(
  entitlements: PlanEntitlement[] | undefined,
  code: string,
): unknown {
  return entitlements?.find((row) => row.code === code)?.defaultValue;
}

export function isEntitlementIncluded(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export interface PlanPricingEstimate {
  perEmployeeFee: number;
  minimumPlatformFee: number;
  seatTotal: number;
  estimatedMonthly: number;
  currency: string;
}

export function calculatePlanPricing(
  plan: Plan | undefined,
  seatLimit: number,
  currency: string,
): PlanPricingEstimate | null {
  if (!plan?.entitlements) return null;

  const perEmployee = parseNumeric(findEntitlementValue(plan.entitlements, PRICING_PER_EMPLOYEE_CODE));
  const minimum = parseNumeric(findEntitlementValue(plan.entitlements, PRICING_MINIMUM_FEE_CODE));
  if (perEmployee == null || minimum == null) return null;

  const seatTotal = perEmployee * seatLimit;
  return {
    perEmployeeFee: perEmployee,
    minimumPlatformFee: minimum,
    seatTotal,
    estimatedMonthly: seatTotal + minimum,
    currency,
  };
}

export function formatPlanComparisonCell(
  code: string,
  value: unknown,
  labels: { included: string; notIncluded: string; optional: string; custom: string },
): string {
  if (code === 'max_employees') {
    const n = parseNumeric(value);
    if (n == null) return '—';
    if (n >= 999999) return labels.custom;
    return n.toLocaleString();
  }

  if (code === 'feature_sso') {
    if (isEntitlementIncluded(value)) return labels.included;
    return labels.optional;
  }

  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    return isEntitlementIncluded(value) ? labels.included : labels.notIncluded;
  }

  const numeric = parseNumeric(value);
  if (numeric != null) return numeric.toLocaleString();
  if (value == null) return '—';
  return String(value);
}
