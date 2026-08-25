import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { PermissionCacheService } from './permission-cache.service';

function formatPermissionCode(action: string, resource: string, scope: string): string {
  if (resource === '.' && scope === '.') return action;
  return `${action}:${resource}:${scope}`;
}

function splitPermissionCode(code: string): { action: string; resource: string; scope: string } {
  const parts = code.split(':');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return { action: parts[0], resource: parts[1], scope: parts[2] };
  }
  return { action: code, resource: '.', scope: '.' };
}

@Injectable()
export class RoleManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async listRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { assignments: true } },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      assignmentCount: role._count.assignments,
      permissions: role.permissions.map((rp) =>
        formatPermissionCode(
          rp.permission.action,
          rp.permission.resource,
          rp.permission.scope,
        ),
      ),
    }));
  }

  async listPermissions() {
    const rows = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return rows.map((p) => ({
      id: p.id,
      code: formatPermissionCode(p.action, p.resource, p.scope),
      action: p.action,
      resource: p.resource,
      scope: p.scope,
      description: p.description,
    }));
  }

  async createRole(
    tenantId: string,
    input: { name: string; description?: string; permissionCodes?: string[] },
    actor: { userId: string; email: string },
    correlationId: string,
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { tenantId, name: input.name },
    });
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NAME_CONFLICT,
        message: `A role named "${input.name}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const permissionIds = await this.resolvePermissionIds(input.permissionCodes ?? []);

    const role = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.role.create({
        data: {
          tenantId,
          name: input.name,
          description: input.description,
          isSystem: false,
          createdBy: actor.userId,
        },
      });

      for (const permissionId of permissionIds) {
        await tx.rolePermission.create({
          data: { roleId: created.id, permissionId },
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'identity',
          action: 'role.created',
          resourceType: 'role',
          resourceId: created.id,
          after: { name: created.name, permissionCodes: input.permissionCodes ?? [] },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      return created;
    });

    return this.getRole(tenantId, role.id);
  }

  async updateRole(
    tenantId: string,
    roleId: string,
    input: { name?: string; description?: string; permissionCodes?: string[] },
    actor: { userId: string; email: string },
    correlationId: string,
  ) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (role.isSystem && input.permissionCodes !== undefined) {
      throw new AppException({
        code: ERROR_CODES.ROLE_IS_SYSTEM,
        message: 'System role permissions cannot be modified.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    if (input.name && input.name !== role.name) {
      const clash = await this.prisma.role.findFirst({
        where: { tenantId, name: input.name, NOT: { id: roleId } },
      });
      if (clash) {
        throw new AppException({
          code: ERROR_CODES.ROLE_NAME_CONFLICT,
          message: `A role named "${input.name}" already exists.`,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

    const permissionIds =
      input.permissionCodes !== undefined
        ? await this.resolvePermissionIds(input.permissionCodes)
        : null;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          rowVersion: { increment: 1 },
        },
      });

      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        for (const permissionId of permissionIds) {
          await tx.rolePermission.create({ data: { roleId, permissionId } });
        }
      }

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'identity',
          action: 'role.updated',
          resourceType: 'role',
          resourceId: roleId,
          after: { ...input },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });
    });

    this.permissionCache.invalidateAll();

    return this.getRole(tenantId, roleId);
  }

  async deleteRole(
    tenantId: string,
    roleId: string,
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<void> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (role.isSystem) {
      throw new AppException({
        code: ERROR_CODES.ROLE_IS_SYSTEM,
        message: 'System roles cannot be deleted.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const assignmentCount = await this.prisma.roleAssignment.count({
      where: { tenantId, roleId },
    });
    if (assignmentCount > 0) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Cannot delete a role that still has assignments.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'identity',
          action: 'role.deleted',
          resourceType: 'role',
          resourceId: roleId,
          before: { name: role.name },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });
    });

    this.permissionCache.invalidateAll();
  }

  private async getRole(tenantId: string, roleId: string) {
    const roles = await this.listRoles(tenantId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return role;
  }

  private async resolvePermissionIds(codes: string[]): Promise<string[]> {
    if (codes.length === 0) return [];
    const ids: string[] = [];
    for (const code of codes) {
      const { action, resource, scope } = splitPermissionCode(code);
      const row = await this.prisma.permission.findUnique({
        where: { action_resource_scope: { action, resource, scope } },
      });
      if (!row) {
        throw new AppException({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: `Unknown permission: ${code}`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      ids.push(row.id);
    }
    return ids;
  }
}
