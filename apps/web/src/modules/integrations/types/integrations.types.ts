export interface IntegrationItem {
  id: string;
  category: string;
  configured: boolean;
  status: 'NOT_CONFIGURED' | 'CONFIGURED' | string;
  configureHref: string;
}

export const INTEGRATION_CATEGORIES = [
  'biometric',
  'sso',
  'payroll_export',
  'finance',
  'email',
  'sms',
  'webhook',
  'api',
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];
