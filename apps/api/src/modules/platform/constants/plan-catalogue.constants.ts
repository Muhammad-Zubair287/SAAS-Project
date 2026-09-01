/** Live Prisma plan.billing_model values (schema comment). */
export const PLAN_BILLING_MODELS = ['FLAT_RATE', 'PER_SEAT', 'USAGE'] as const;
export type PlanBillingModel = (typeof PLAN_BILLING_MODELS)[number];

/** Operational plan catalogue statuses used by the live schema. */
export const PLAN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const ENTITLEMENT_DATA_TYPES = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING'] as const;
