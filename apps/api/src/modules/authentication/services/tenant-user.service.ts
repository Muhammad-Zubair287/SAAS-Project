import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import { PasswordResetService } from './password-reset.service';
import type { RequestContext } from './auth.service';

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

@Injectable()
export class TenantUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  async listUsers(tenantId: string, query: ListUsersQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = toPrismaSkipTake({ page, pageSize });

    const membershipFilter: Prisma.RoleAssignmentWhereInput = {
      tenantId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    const userWhere: Prisma.AppUserWhereInput = {
      roleAssignments: { some: membershipFilter },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.appUser.count({ where: userWhere }),
      this.prisma.appUser.findMany({
        where: userWhere,
        skip,
        take,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          lastLoginAt: true,
          requirePasswordReset: true,
          requireMfa: true,
          deactivatedAt: true,
          roleAssignments: {
            where: membershipFilter,
            select: {
              role: { select: { id: true, name: true } },
            },
          },
          mfaCredentials: {
            where: { tenantId, status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      mfaStatus: u.mfaCredentials.length > 0 ? 'enabled' : u.requireMfa ? 'required' : 'disabled',
      requirePasswordReset: u.requirePasswordReset,
      requireMfa: u.requireMfa,
      roles: u.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
      })),
    }));

    return createPaginatedResponse(data, total, page, pageSize);
  }

  async getUser(tenantId: string, userId: string) {
    const user = await this.findTenantUserOrThrow(tenantId, userId);
    return user;
  }

  async deactivate(
    tenantId: string,
    userId: string,
    actor: { userId: string; email: string },
    ctx: RequestContext,
  ) {
    if (userId === actor.userId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'You cannot deactivate your own account.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    await this.assertMembership(tenantId, userId);

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.appUser.update({
        where: { id: userId },
        data: {
          status: 'DEACTIVATED',
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      await tx.session.updateMany({
        where: { userId, tenantId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'identity',
          action: 'user.deactivated',
          resourceType: 'app_user',
          resourceId: userId,
          correlationId: ctx.correlationId,
          severity: AuditEventSeverity.WARNING,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      });
    });

    return { id: userId, status: 'DEACTIVATED' };
  }

  async requirePasswordReset(
    tenantId: string,
    userId: string,
    actor: { userId: string; email: string },
    ctx: RequestContext,
  ) {
    const user = await this.findTenantUserOrThrow(tenantId, userId);
    await this.prisma.appUser.update({
      where: { id: userId },
      data: { requirePasswordReset: true },
    });
    await this.passwordReset.requestPasswordReset({ email: user.email }, ctx);
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor.userId,
        actorType: AuditActorType.USER,
        actorEmail: actor.email,
        module: 'identity',
        action: 'user.require_password_reset',
        resourceType: 'app_user',
        resourceId: userId,
        correlationId: ctx.correlationId,
        severity: AuditEventSeverity.INFO,
      },
    });
    return { id: userId, requirePasswordReset: true };
  }

  async requireMfa(
    tenantId: string,
    userId: string,
    actor: { userId: string; email: string },
    ctx: RequestContext,
  ) {
    await this.assertMembership(tenantId, userId);
    await this.prisma.appUser.update({
      where: { id: userId },
      data: { requireMfa: true },
    });
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor.userId,
        actorType: AuditActorType.USER,
        actorEmail: actor.email,
        module: 'identity',
        action: 'user.require_mfa',
        resourceType: 'app_user',
        resourceId: userId,
        correlationId: ctx.correlationId,
        severity: AuditEventSeverity.INFO,
      },
    });
    return { id: userId, requireMfa: true };
  }

  private async assertMembership(tenantId: string, userId: string): Promise<void> {
    const count = await this.prisma.roleAssignment.count({
      where: {
        tenantId,
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (count === 0) {
      throw new AppException({
        code: ERROR_CODES.USER_NOT_IN_TENANT,
        message: 'User is not a member of this tenant.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
  }

  private async findTenantUserOrThrow(tenantId: string, userId: string) {
    await this.assertMembership(tenantId, userId);
    const user = await this.prisma.appUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        lastLoginAt: true,
        requirePasswordReset: true,
        requireMfa: true,
        deactivatedAt: true,
        roleAssignments: {
          where: {
            tenantId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { role: { select: { id: true, name: true } } },
        },
        mfaCredentials: {
          where: { tenantId, status: 'ACTIVE' },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!user) {
      throw new AppException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      mfaStatus: user.mfaCredentials.length > 0 ? 'enabled' : user.requireMfa ? 'required' : 'disabled',
      requirePasswordReset: user.requirePasswordReset,
      requireMfa: user.requireMfa,
      roles: user.roleAssignments.map((ra) => ({ id: ra.role.id, name: ra.role.name })),
    };
  }
}
