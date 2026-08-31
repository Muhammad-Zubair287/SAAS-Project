import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import {
  ALWAYS_ENABLED_ENTITLEMENTS,
  SUPPORT_TIER_DEDICATED_MAP,
  type SupportTier,
} from '../constants/tenant-provisioning.constants';

function entitlementIncluded(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export interface EntitlementOverrideInput {
  code: string;
  value: boolean | number | string;
}

export function validateEntitlementOverrides(
  overrides: EntitlementOverrideInput[] | undefined,
  planEntitlements: Map<string, unknown>,
  supportTier?: string,
): void {
  for (const override of overrides ?? []) {
    if (ALWAYS_ENABLED_ENTITLEMENTS.has(override.code) && override.value === false) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Entitlement "${override.code}" cannot be disabled at provisioning.`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const planDefault = planEntitlements.get(override.code);
    if (planDefault === undefined) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Unknown entitlement "${override.code}".`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    if (!entitlementIncluded(planDefault) && entitlementIncluded(override.value)) {
      throw new AppException({
        code: ERROR_CODES.PLAN_NOT_FOUND,
        message: `Entitlement "${override.code}" is not included in the selected plan.`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }

  if (supportTier) {
    const dedicatedRequired = SUPPORT_TIER_DEDICATED_MAP[supportTier as SupportTier];
    const planDedicated = planEntitlements.get('feature_dedicated_support');
    if (dedicatedRequired && !entitlementIncluded(planDedicated)) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Enterprise support tier requires an Enterprise plan.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }
}

export function calculateCommercialPricing(
  perEmployee: number,
  minimumFee: number,
  seatLimit: number,
): { seatTotal: number; estimatedMonthly: number } {
  const seatTotal = perEmployee * seatLimit;
  return { seatTotal, estimatedMonthly: seatTotal + minimumFee };
}
