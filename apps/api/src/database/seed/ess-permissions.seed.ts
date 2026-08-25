/**
 * M11 ESS permission catalogue + system Employee role seed.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { ESS_EMPLOYEE_PERMISSION_CODES } from '../../common/constants/permissions.constants';

type DbClient = PrismaClient | Prisma.TransactionClient;

const EMPLOYEE_ROLE_NAME = 'Employee';

const DEFAULT_LEAVE_TYPES = [
  { code: 'ANNUAL', name: 'Annual Leave', paidStatus: 'PAID', unit: 'DAY', halfDayAllowed: true },
  { code: 'SICK', name: 'Sick Leave', paidStatus: 'PAID', unit: 'DAY', halfDayAllowed: true },
  { code: 'UNPAID', name: 'Unpaid Leave', paidStatus: 'UNPAID', unit: 'DAY', halfDayAllowed: true },
] as const;

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
      description: `ESS: ${code}`,
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

export async function seedEssPermissions(
  prisma: DbClient,
  options?: { tenantId?: string },
): Promise<{ permissions: string[]; rolesUpdated: number }> {
  const rows = [];
  for (const code of ESS_EMPLOYEE_PERMISSION_CODES) {
    rows.push(await ensurePermission(prisma, code));
  }
  const permissionIds = rows.map((r) => r.id);

  const roles = await prisma.role.findMany({
    where: {
      ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
      name: { equals: EMPLOYEE_ROLE_NAME, mode: 'insensitive' },
    },
    select: { id: true, name: true },
  });

  let rolesUpdated = 0;
  for (const role of roles) {
    await attachPermissions(prisma, role.id, permissionIds);
    rolesUpdated += 1;
  }

  return {
    permissions: [...ESS_EMPLOYEE_PERMISSION_CODES],
    rolesUpdated,
  };
}

export async function ensureEssPermissionsForTenant(
  prisma: DbClient,
  tenantId: string,
): Promise<void> {
  let role = await prisma.role.findFirst({
    where: { tenantId, name: EMPLOYEE_ROLE_NAME },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId,
        name: EMPLOYEE_ROLE_NAME,
        description: 'Employee self-service access',
        isSystem: true,
      },
    });
  }
  await seedEssPermissions(prisma, { tenantId });
  await ensureEssLeaveDefaultsForTenant(prisma, tenantId);
}

export async function ensureEssLeaveDefaultsForTenant(
  prisma: DbClient,
  tenantId: string,
): Promise<void> {
  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { tenantId_code: { tenantId, code: leaveType.code } },
      create: {
        tenantId,
        code: leaveType.code,
        name: leaveType.name,
        paidStatus: leaveType.paidStatus,
        unit: leaveType.unit,
        halfDayAllowed: leaveType.halfDayAllowed,
        status: 'ACTIVE',
      },
      update: {
        name: leaveType.name,
        paidStatus: leaveType.paidStatus,
        unit: leaveType.unit,
        halfDayAllowed: leaveType.halfDayAllowed,
        status: 'ACTIVE',
      },
    });
  }
}
