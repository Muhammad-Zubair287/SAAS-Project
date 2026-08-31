import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { containsInjectionPayload } from './validators/is-safe-text.validator';
import { CreateTenantDto } from '../../modules/platform/dto/create-tenant.dto';

describe('input-security', () => {
  describe('containsInjectionPayload', () => {
    it('rejects HTML tags', () => {
      expect(containsInjectionPayload('<script>alert(1)</script>')).toBe(true);
    });

    it('rejects SQL injection fragments', () => {
      expect(containsInjectionPayload("' OR 1=1 --")).toBe(true);
    });

    it('allows normal business names', () => {
      expect(containsInjectionPayload('Northstar Textiles (Pvt) Ltd')).toBe(false);
    });
  });
});

describe('CreateTenantDto security validation', () => {
  function dto(payload: Record<string, unknown>) {
    return plainToInstance(CreateTenantDto, payload);
  }

  const validBase = {
    displayName: 'Northstar Textiles',
    legalName: 'Northstar Textiles Pvt Ltd',
    countryCode: 'PK',
    currency: 'PKR',
    timeZone: 'Asia/Karachi',
    primaryLocale: 'en-PK',
    hostingRegion: 'aws-ap-south-1',
    planKey: 'growth',
    seatLimit: 100,
    primaryAdmin: { name: 'Ayesha Khan', email: 'ayesha.khan@example.com' },
  };

  it('accepts a valid payload', async () => {
    const errors = await validate(dto(validBase));
    expect(errors).toHaveLength(0);
  });

  it('rejects whitespace-only displayName', async () => {
    const errors = await validate(dto({ ...validBase, displayName: '   ' }));
    expect(errors.some((e) => e.property === 'displayName')).toBe(true);
  });

  it('rejects XSS in legalName', async () => {
    const errors = await validate(
      dto({ ...validBase, legalName: '<img onerror=alert(1)>' }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects phone with spaces', async () => {
    const errors = await validate(
      dto({
        ...validBase,
        primaryAdmin: { ...validBase.primaryAdmin, phone: '+92 300 1234567' },
      }),
    );
    const adminErrors = errors.find((e) => e.property === 'primaryAdmin');
    expect(adminErrors?.children?.some((c) => c.property === 'phone')).toBe(true);
  });

  it('accepts optional phone with leading plus', async () => {
    const errors = await validate(
      dto({
        ...validBase,
        primaryAdmin: { ...validBase.primaryAdmin, phone: '+923001234567' },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects non-numeric MFA code', async () => {
    const errors = await validate(dto({ ...validBase, mfaCode: 'abc123' }));
    expect(errors.some((e) => e.property === 'mfaCode')).toBe(true);
  });
});
