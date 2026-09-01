import { z } from 'zod';
import {
  ORGANIZATION_NAME_PATTERN,
  PLAN_CODE_PATTERN,
  containsInjectionPayload,
  sanitizeTrimmed,
} from '../../../lib/validation/input-security';

const safePlanCode = z
  .string()
  .transform((v) => sanitizeTrimmed(v).toLowerCase())
  .refine((v) => v.length >= 2, 'required')
  .refine((v) => !containsInjectionPayload(v), 'unsafe')
  .refine((v) => PLAN_CODE_PATTERN.test(v), 'format');

const safePlanName = z
  .string()
  .transform(sanitizeTrimmed)
  .refine((v) => v.length >= 2, 'required')
  .refine((v) => !containsInjectionPayload(v), 'unsafe')
  .refine((v) => ORGANIZATION_NAME_PATTERN.test(v), 'format');

const safePlanDescription = z
  .string()
  .transform(sanitizeTrimmed)
  .refine((v) => v.length === 0 || !containsInjectionPayload(v), 'unsafe')
  .refine((v) => v.length <= 2000, 'maxLength');

export const planFormSchema = z.object({
  code: safePlanCode,
  name: safePlanName,
  description: safePlanDescription,
  billingModel: z.string().min(1),
  status: z.string().min(1),
});

export type PlanFormSchema = z.infer<typeof planFormSchema>;

export function validatePlanForm(values: {
  code: string;
  name: string;
  description: string;
  billingModel: string;
  status: string;
}): { ok: true; data: PlanFormSchema } | { ok: false; messageKey: string } {
  const result = planFormSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  if (issue?.path[0] === 'code') {
    return { ok: false, messageKey: 'platform.plans.validation.code' };
  }
  if (issue?.path[0] === 'name') {
    return { ok: false, messageKey: 'platform.plans.validation.name' };
  }
  if (issue?.path[0] === 'description') {
    return { ok: false, messageKey: 'platform.plans.validation.description' };
  }
  return { ok: false, messageKey: 'platform.plans.validation.required' };
}
