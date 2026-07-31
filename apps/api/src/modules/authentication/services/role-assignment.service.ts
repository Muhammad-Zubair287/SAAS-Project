import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { RbacRepository } from '../repositories/rbac.repository';
import { PermissionCacheService } from './permission-cache.service';
import type { AssignRoleDto } from '../dto/assign-role.dto';
import type { RequestContext } from './auth.service';

export interface RoleAssignmentResponse {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  grantedBy: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class RoleAssignmentService {
  constructor(
    private readonly rbacRepo: RbacRepository,
    private readonly cache: PermissionCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async assignRole(
    roleId: string,
    dto: AssignRoleDto,
    actorUserId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<RoleAssignmentResponse> {
    const role = await this.rbacRepo.findRoleById(roleId);
    if (!role) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (role.tenantId !== tenantId) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'Role does not belong to this tenant.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const targetUser = await this.rbacRepo.findUserById(dto.userId);
    if (!targetUser) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const existing = await this.rbacRepo.findRoleAssignment(dto.userId, roleId, tenantId);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.ROLE_ALREADY_ASSIGNED,
        message: 'User already has this role assigned.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const assignment = await this.rbacRepo.createRoleAssignment({
      tenantId,
      userId: dto.userId,
      roleId,
      grantedBy: actorUserId,
      expiresAt,
    });

    this.cache.invalidate(dto.userId, tenantId);

    await this.emitAudit({
      tenantId,
      actorId: actorUserId,
      action: 'ROLE_ASSIGNED',
      resourceId: assignment.id,
      metadata: { targetUserId: dto.userId, roleId, roleName: role.name, expiresAt },
      correlationId: ctx.correlationId,
    });

    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      userId: assignment.userId,
      roleId: assignment.roleId,
      grantedBy: assignment.grantedBy,
      grantedAt: assignment.grantedAt,
      expiresAt: assignment.expiresAt,
    };
  }

  async revokeRole(
    roleId: string,
    targetUserId: string,
    actorUserId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const role = await this.rbacRepo.findRoleById(roleId);
    if (!role) {
      throw new AppException({
        code: ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const existing = await this.rbacRepo.findRoleAssignment(targetUserId, roleId, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Role assignment not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    await this.rbacRepo.deleteRoleAssignment(targetUserId, roleId, tenantId);

    this.cache.invalidate(targetUserId, tenantId);

    await this.emitAudit({
      tenantId,
      actorId: actorUserId,
      action: 'ROLE_REVOKED',
      resourceId: existing.id,
      metadata: { targetUserId, roleId, roleName: role.name },
      correlationId: ctx.correlationId,
    });
  }

  async getUserRoles(
    userId: string,
    tenantId: string,
  ): Promise<RoleAssignmentResponse[]> {
    const assignments = await this.rbacRepo.findUserRoleAssignments(userId, tenantId);
    return assignments.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      userId: a.userId,
      roleId: a.roleId,
      grantedBy: a.grantedBy,
      grantedAt: a.grantedAt,
      expiresAt: a.expiresAt,
    }));
  }

  private async emitAudit(data: {
    tenantId: string;
    actorId: string;
    action: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    correlationId: string;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.actorId,
          actorType: 'USER',
          module: 'authentication',
          action: data.action,
          resourceType: 'role_assignment',
          resourceId: data.resourceId,
          ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
          correlationId: data.correlationId,
          severity: 'INFO',
        },
      });
    } catch {
      // Audit failure must never interrupt a role assignment operation.
    }
  }
}
