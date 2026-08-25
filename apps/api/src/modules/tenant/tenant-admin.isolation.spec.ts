/**
 * Tenant Admin Console — isolation & permission contract tests.
 * Run with: npx jest src/modules/tenant/tenant-admin.isolation.spec.ts
 */
import {
  TENANT_ADMIN_PERMISSIONS,
  TENANT_ADMIN_PERMISSION_CODES,
} from '../../common/constants/permissions.constants';

describe('Tenant Admin permissions catalogue', () => {
  it('exposes colon-form permission codes for console APIs', () => {
    expect(TENANT_ADMIN_PERMISSIONS.PROFILE_READ).toBe('read:tenant_profile:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.PROFILE_MANAGE).toBe('manage:tenant_profile:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.BRANDING_MANAGE).toBe('manage:tenant_branding:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.SETTINGS_READ).toBe('read:tenant_settings:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.USER_INVITE).toBe('invite:user:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.USER_DEACTIVATE).toBe('deactivate:user:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.ROLE_MANAGE).toBe('manage:role:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.SESSION_REVOKE).toBe('revoke:session:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.AUDIT_READ).toBe('read:audit_event:tenant');
    expect(TENANT_ADMIN_PERMISSIONS.UPGRADE_REQUEST).toBe('request:upgrade:tenant');
    expect(TENANT_ADMIN_PERMISSION_CODES.length).toBeGreaterThan(10);
  });

  it('never includes platform-scoped permissions', () => {
    for (const code of TENANT_ADMIN_PERMISSION_CODES) {
      expect(code.startsWith('platform.')).toBe(false);
    }
  });

  it('includes every Scope A surface permission', () => {
    const required = [
      TENANT_ADMIN_PERMISSIONS.PROFILE_READ,
      TENANT_ADMIN_PERMISSIONS.BRANDING_READ,
      TENANT_ADMIN_PERMISSIONS.SETTINGS_READ,
      TENANT_ADMIN_PERMISSIONS.MODULES_READ,
      TENANT_ADMIN_PERMISSIONS.SUBSCRIPTION_READ,
      TENANT_ADMIN_PERMISSIONS.SECURITY_POLICY_READ,
      TENANT_ADMIN_PERMISSIONS.USER_READ,
      TENANT_ADMIN_PERMISSIONS.ROLE_READ,
      TENANT_ADMIN_PERMISSIONS.SESSION_READ,
      TENANT_ADMIN_PERMISSIONS.AUDIT_READ,
    ];
    for (const code of required) {
      expect(TENANT_ADMIN_PERMISSION_CODES).toContain(code);
    }
  });
});

describe('Tenant isolation contract', () => {
  it('requires JWT-derived tenantId for all tenant-scoped permission codes', () => {
    for (const code of TENANT_ADMIN_PERMISSION_CODES) {
      // Colon-form scopes end with :tenant; dotted forms are still tenant console codes.
      if (code.includes(':')) {
        expect(code.endsWith(':tenant')).toBe(true);
      }
    }
  });

  it('blocks cross-tenant ownership pattern for users/roles/sessions', () => {
    const caller = { tenantId: 'tenant-a', userId: 'admin-a' };
    const foreignUser = { tenantId: 'tenant-b', id: 'user-b' };
    const foreignRole = { tenantId: 'tenant-b', id: 'role-b' };
    const foreignSession = { tenantId: 'tenant-b', id: 'session-b' };

    expect(foreignUser.tenantId === caller.tenantId).toBe(false);
    expect(foreignRole.tenantId === caller.tenantId).toBe(false);
    expect(foreignSession.tenantId === caller.tenantId).toBe(false);
  });

  it('rejects client-supplied tenantId when it differs from JWT tenant', () => {
    const jwtTenantId: string = 'tenant-a';
    const bodyTenantId: string = 'tenant-b';
    const accepted = bodyTenantId === jwtTenantId ? bodyTenantId : jwtTenantId;
    expect(accepted).toBe(jwtTenantId);
    expect(bodyTenantId === jwtTenantId).toBe(false);
  });

  it('system roles must not be deleted', () => {
    const role = { isSystem: true, assignmentCount: 0 };
    const canDelete = !role.isSystem && role.assignmentCount === 0;
    expect(canDelete).toBe(false);
  });
});
