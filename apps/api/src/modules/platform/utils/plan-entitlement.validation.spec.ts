import { coerceEntitlementValue, validatePlanEntitlementItems } from './plan-entitlement.validation';

describe('plan-entitlement.validation', () => {
  const catalogue = [
    { id: 'e1', code: 'feature_core_hr', dataType: 'BOOLEAN' },
    { id: 'e2', code: 'max_employees', dataType: 'INTEGER' },
    { id: 'e3', code: 'pricing_per_employee_monthly', dataType: 'DECIMAL' },
    { id: 'e4', code: 'notes', dataType: 'STRING' },
  ];

  it('coerces boolean entitlement values', () => {
    expect(coerceEntitlementValue('BOOLEAN', true)).toBe(true);
    expect(coerceEntitlementValue('BOOLEAN', 'false')).toBe(false);
  });

  it('validates and coerces plan entitlement items', () => {
    const items = validatePlanEntitlementItems(
      [
        { entitlementId: 'e1', defaultValue: 'true' },
        { entitlementId: 'e2', defaultValue: '25' },
        { entitlementId: 'e3', defaultValue: '12.5' },
        { entitlementId: 'e4', defaultValue: 'enterprise' },
      ],
      catalogue,
    );

    expect(items[0]?.defaultValue).toBe(true);
    expect(items[1]?.defaultValue).toBe(25);
    expect(items[2]?.defaultValue).toBe(12.5);
    expect(items[3]?.defaultValue).toBe('enterprise');
  });
});
