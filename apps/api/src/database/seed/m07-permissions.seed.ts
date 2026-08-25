/**
 * M07 permission catalogue seed — production-oriented upsert.
 *
 * Upserts global Permission rows for:
 *   - shift.read | shift.create | shift.update  (Phase 1 debt closure)
 *   - roster.read | roster.assign | roster.override  (Phase 2)
 *   - attendance.policy.read (needed for Shift form policy selector — not broad policy.*)
 *
 * Attaches them to HR/Admin-style tenant roles. For a specific tenant, also
 * ensures canonical system roles exist:
 *   Tenant Admin, HR Manager
 *
 * Called from tenant create/activate provisioning. Includes roster.publish for HR roles.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  ATTENDANCE_POLICY_PERMISSIONS,
  ROSTER_PERMISSIONS,
  SHIFT_PERMISSIONS,
} from '../../common/constants/permissions.constants';

const HR_ADMIN_ROLE_NAME_PATTERNS = [
  /^tenant\s*admin$/i,
  /^hr\s*admin$/i,
  /^hr\s*manager$/i,
  /^attendance\s*manager$/i,
  /^smoke\s*attendance\s*manager$/i,
];

/** Canonical roles ensured for each tenant during provisioning. */
export const M07_DEFAULT_TENANT_ROLES = [
  { name: 'Tenant Admin', description: 'Organisation administrator' },
  { name: 'HR Manager', description: 'HR operations manager' },
] as const;

/** Full HR/Admin Shift + Assignment permission set (includes override). */
export const M07_HR_PERMISSION_CODES: string[] = [
  SHIFT_PERMISSIONS.READ,
  SHIFT_PERMISSIONS.CREATE,
  SHIFT_PERMISSIONS.UPDATE,
  ROSTER_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.ASSIGN,
  ROSTER_PERMISSIONS.OVERRIDE,
  ROSTER_PERMISSIONS.PUBLISH,
  ATTENDANCE_POLICY_PERMISSIONS.READ,
];

/** Assign-capable set without override — for restricted assigner roles. */
export const M07_ASSIGN_ONLY_PERMISSION_CODES: string[] = [
  SHIFT_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.ASSIGN,
  ATTENDANCE_POLICY_PERMISSIONS.READ,
];

/** Read-only Shift + Assignment visibility. */
export const M07_READ_ONLY_PERMISSION_CODES: string[] = [
  SHIFT_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.READ,
];

type DbClient = PrismaClient | Prisma.TransactionClient;

async function ensurePermission(prisma: DbClient, code: string) {
  return prisma.permission.upsert({
    where: {
      action_resource_scope: { action: code, resource: '.', scope: '.' },
    },
    create: {
      action: code,
      resource: '.',
      scope: '.',
      description: `M07 catalogue: ${code}`,
    },
    update: {},
  });
}

function isHrAdminRoleName(name: string): boolean {
  return HR_ADMIN_ROLE_NAME_PATTERNS.some((re) => re.test(name.trim()));
}

async function attachPermissions(
  prisma: DbClient,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }
}

/**
 * Upsert global M07 catalogue and attach to matching roles across all tenants.
 * Optionally scope role attachment to a single tenantId.
 */
export async function seedM07Permissions(
  prisma: DbClient,
  options?: { tenantId?: string },
): Promise<{
  permissions: string[];
  rolesUpdated: { tenantId: string; roleId: string; name: string }[];
}> {
  const rows = [];
  for (const code of M07_HR_PERMISSION_CODES) {
    rows.push(await ensurePermission(prisma, code));
  }
  const permissionIds = rows.map((r) => r.id);

  const roles = await prisma.role.findMany({
    where: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    select: { id: true, tenantId: true, name: true },
  });
  const rolesUpdated: { tenantId: string; roleId: string; name: string }[] = [];

  for (const role of roles) {
    if (!isHrAdminRoleName(role.name)) continue;
    await attachPermissions(prisma, role.id, permissionIds);
    rolesUpdated.push({
      tenantId: role.tenantId,
      roleId: role.id,
      name: role.name,
    });
  }

  return {
    permissions: M07_HR_PERMISSION_CODES,
    rolesUpdated,
  };
}

/**
 * Provision M07 permissions for a tenant: catalogue + default system roles.
 * Safe to call repeatedly (idempotent).
 */
export async function ensureM07PermissionsForTenant(
  prisma: DbClient,
  tenantId: string,
): Promise<{
  permissions: string[];
  rolesUpdated: { tenantId: string; roleId: string; name: string }[];
}> {
  const rows = [];
  for (const code of M07_HR_PERMISSION_CODES) {
    rows.push(await ensurePermission(prisma, code));
  }
  const permissionIds = rows.map((r) => r.id);

  for (const def of M07_DEFAULT_TENANT_ROLES) {
    let role = await prisma.role.findFirst({
      where: { tenantId, name: def.name },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          tenantId,
          name: def.name,
          description: def.description,
          isSystem: true,
        },
      });
    }
    await attachPermissions(prisma, role.id, permissionIds);
  }

  // Also attach to any other matching HR/Admin-named roles on this tenant.
  return seedM07Permissions(prisma, { tenantId });
}
