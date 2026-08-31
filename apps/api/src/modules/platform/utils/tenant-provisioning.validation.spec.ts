import { validateEntitlementOverrides, calculateCommercialPricing } from './tenant-provisioning.validation';
import { AppException } from '../../../common/exceptions/app.exception';

describe('tenant-provisioning.validation', () => {
  it('rejects enabling payroll on essential plan', () => {
    const plan = new Map<string, unknown>([['feature_payroll', false]]);
    expect(() =>
      validateEntitlementOverrides([{ code: 'feature_payroll', value: true }], plan),
    ).toThrow(AppException);
  });

  it('rejects disabling always-on modules', () => {
    const plan = new Map<string, unknown>([['feature_core_hr', true]]);
    expect(() =>
      validateEntitlementOverrides([{ code: 'feature_core_hr', value: false }], plan),
    ).toThrow(AppException);
  });

  it('calculates commercial pricing totals', () => {
    expect(calculateCommercialPricing(450, 15000, 350)).toEqual({
      seatTotal: 157500,
      estimatedMonthly: 172500,
    });
  });
});
