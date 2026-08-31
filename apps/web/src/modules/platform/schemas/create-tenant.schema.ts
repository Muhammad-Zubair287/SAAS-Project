import { z } from 'zod';
import {
  EMAIL_PATTERN,
  INTERNATIONAL_PHONE_PATTERN,
  ISO_DATE_PATTERN,
  ORGANIZATION_NAME_PATTERN,
  OTP_CODE_PATTERN,
  PERSON_NAME_PATTERN,
  containsInjectionPayload,
  sanitizeTrimmed,
} from '../../../lib/validation/input-security';

const safeOrganizationName = z
  .string()
  .transform(sanitizeTrimmed)
  .refine((v) => v.length >= 2, 'required')
  .refine((v) => !containsInjectionPayload(v), 'unsafe')
  .refine((v) => ORGANIZATION_NAME_PATTERN.test(v), 'format');

const safePersonName = z
  .string()
  .transform(sanitizeTrimmed)
  .refine((v) => v.length >= 2, 'required')
  .refine((v) => !containsInjectionPayload(v), 'unsafe')
  .refine((v) => PERSON_NAME_PATTERN.test(v), 'format');

const safeEmail = z
  .string()
  .transform((v) => sanitizeTrimmed(v).toLowerCase())
  .refine((v: string) => v.length > 0, 'required')
  .refine((v: string) => EMAIL_PATTERN.test(v), 'format')
  .refine((v: string) => !containsInjectionPayload(v), 'unsafe')
  .refine((v: string) => v.length <= 254, 'maxLength');

const optionalPhone = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = sanitizeTrimmed(value);
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .regex(INTERNATIONAL_PHONE_PATTERN)
    .optional(),
);

export const createTenantCompanyStepSchema = z.object({
  displayName: safeOrganizationName,
  legalName: safeOrganizationName,
  countryCode: z.string().length(2),
  currency: z.string().length(3),
  timeZone: z.string().min(1),
  primaryLocale: z.string().min(1),
});

export const createTenantCommercialStepSchema = z
  .object({
    planKey: z.string().min(1),
    billingCycle: z.enum(['monthly', 'annual']),
    trialOn: z.boolean(),
    trialEndsAt: z.string().optional(),
    seatLimit: z.number().int().min(1).max(100_000),
    storageLimitGb: z.number().int().min(1).max(100_000),
  })
  .superRefine((data, ctx) => {
    if (data.trialOn) {
      if (!data.trialEndsAt || !ISO_DATE_PATTERN.test(data.trialEndsAt)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['trialEndsAt'], message: 'required' });
      }
    }
  });

export const createTenantProductStepSchema = z.object({
  hostingRegion: z.string().min(1),
  supportTierKey: z.string().min(1),
});

export const createTenantAdminStepSchema = z.object({
  name: safePersonName,
  email: safeEmail,
  phone: optionalPhone,
});

export const createTenantMfaSchema = z.object({
  mfaCode: z
    .string()
    .transform(sanitizeTrimmed)
    .refine((v) => OTP_CODE_PATTERN.test(v), 'format'),
});

export type CreateTenantStepErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): CreateTenantStepErrors {
  const out: CreateTenantStepErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
