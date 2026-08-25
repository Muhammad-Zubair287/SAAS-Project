import { ROUTES } from '../../../constants/routes.constants';
import type { IntegrationCategory } from '../types/integrations.types';

export interface IntegrationCatalogueDef {
  id: IntegrationCategory;
  category: IntegrationCategory;
  titleKey: string;
  descriptionKey: string;
  configureHref: string;
}

export const INTEGRATION_CATALOGUE: IntegrationCatalogueDef[] = [
  {
    id: 'biometric',
    category: 'biometric',
    titleKey: 'tenant.integrations.categories.biometric.title',
    descriptionKey: 'tenant.integrations.categories.biometric.description',
    configureHref: ROUTES.TENANT.ATTENDANCE.DEVICES,
  },
  {
    id: 'sso',
    category: 'sso',
    titleKey: 'tenant.integrations.categories.sso.title',
    descriptionKey: 'tenant.integrations.categories.sso.description',
    configureHref: ROUTES.TENANT.SETTINGS_SECURITY,
  },
  {
    id: 'payroll_export',
    category: 'payroll_export',
    titleKey: 'tenant.integrations.categories.payrollExport.title',
    descriptionKey: 'tenant.integrations.categories.payrollExport.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
  {
    id: 'finance',
    category: 'finance',
    titleKey: 'tenant.integrations.categories.finance.title',
    descriptionKey: 'tenant.integrations.categories.finance.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
  {
    id: 'email',
    category: 'email',
    titleKey: 'tenant.integrations.categories.email.title',
    descriptionKey: 'tenant.integrations.categories.email.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
  {
    id: 'sms',
    category: 'sms',
    titleKey: 'tenant.integrations.categories.sms.title',
    descriptionKey: 'tenant.integrations.categories.sms.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
  {
    id: 'webhook',
    category: 'webhook',
    titleKey: 'tenant.integrations.categories.webhook.title',
    descriptionKey: 'tenant.integrations.categories.webhook.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
  {
    id: 'api',
    category: 'api',
    titleKey: 'tenant.integrations.categories.api.title',
    descriptionKey: 'tenant.integrations.categories.api.description',
    configureHref: ROUTES.TENANT.SETTINGS,
  },
];
