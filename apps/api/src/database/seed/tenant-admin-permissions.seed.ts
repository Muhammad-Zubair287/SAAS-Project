/**
 * Tenant Admin Console permission catalogue seed.
 * Upserts colon-form permissions and attaches them to the Tenant Admin system role.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { TENANT_ADMIN_PERMISSION_CODES } from '../../common/constants/permissions.constants';

type DbClient = PrismaClient | Prisma.TransactionClient;

function splitPermissionCode(code: string): { action: string; resource: string; scope: string } {
  const parts = code.split(':');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return { action: parts[0], resource: parts[1], scope: parts[2] };
  }
  return { action: code, resource: '.', scope: '.' };
}

async function ensurePermission(prisma: DbClient, code: string) {
  const { action, resource, scope } = splitPermissionCode(code);
  return prisma.permission.upsert({
    where: { action_resource_scope: { action, resource, scope } },
    create: {
      action,
      resource,
      scope,
      description: `Tenant Admin: ${code}`,
    },
    update: {},
  });
}

async function attachPermissions(
  prisma: DbClient,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }
}

export async function seedTenantAdminPermissions(
  prisma: DbClient,
  options?: { tenantId?: string },
): Promise<{ permissions: string[]; rolesUpdated: number }> {
  const rows = [];
  for (const code of TENANT_ADMIN_PERMISSION_CODES) {
    rows.push(await ensurePermission(prisma, code));
  }
  const permissionIds = rows.map((r) => r.id);

  const roles = await prisma.role.findMany({
    where: {
      ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
      name: { equals: 'Tenant Admin', mode: 'insensitive' },
    },
    select: { id: true },
  });

  for (const role of roles) {
    await attachPermissions(prisma, role.id, permissionIds);
  }

  return {
    permissions: [...TENANT_ADMIN_PERMISSION_CODES],
    rolesUpdated: roles.length,
  };
}

export async function ensureTenantAdminPermissionsForTenant(
  prisma: DbClient,
  tenantId: string,
): Promise<void> {
  let role = await prisma.role.findFirst({
    where: { tenantId, name: 'Tenant Admin' },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId,
        name: 'Tenant Admin',
        description: 'Organisation administrator',
        isSystem: true,
      },
    });
  }
  await seedTenantAdminPermissions(prisma, { tenantId });
}
