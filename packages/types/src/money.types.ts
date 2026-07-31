// Money is always serialized as string to preserve numeric(19,4) precision (TSA §17).
// Never use float or number for monetary values.

export interface Money {
  amount: string;
  currency: string;
}

export const SUPPORTED_CURRENCIES = [
  'PKR',
  'USD',
  'GBP',
  'AED',
  'SAR',
  'EUR',
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
