import { Injectable } from '@nestjs/common';

export const INTEGRATION_CATALOGUE = [
  { id: 'biometric', category: 'biometric', configureHref: '/attendance/devices' },
  { id: 'sso', category: 'sso', configureHref: '/settings/security' },
  { id: 'payroll_export', category: 'payroll_export', configureHref: '/settings' },
  { id: 'finance', category: 'finance', configureHref: '/settings' },
  { id: 'email', category: 'email', configureHref: '/settings' },
  { id: 'sms', category: 'sms', configureHref: '/settings' },
  { id: 'webhook', category: 'webhook', configureHref: '/settings' },
  { id: 'api', category: 'api', configureHref: '/settings' },
] as const;

@Injectable()
export class IntegrationsCatalogueService {
  /**
   * Returns static catalogue with configured=false until TenantIntegration storage exists.
   * Never invents a "connected" status.
   */
  list(_tenantId: string) {
    return INTEGRATION_CATALOGUE.map((item) => ({
      id: item.id,
      category: item.category,
      configured: false,
      status: 'NOT_CONFIGURED' as const,
      configureHref: item.configureHref,
    }));
  }
}
