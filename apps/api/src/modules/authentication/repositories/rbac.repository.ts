import { Injectable } from '@nestjs/common';
import type { RoleAssignment } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface RoleAssignmentWithPermissions {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  grantedBy: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
  role: {
    id: string;
    name: string;
    permissions: {
      permission: {
        id: string;
        action: string;
        resource: string;
        scope: string;
      };
    }[];
  };
}

@Injectable()
export class RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveRoleAssignmentsWithPermissions(
    userId: string,
    tenantId: string,
  ): Promise<RoleAssignmentWithPermissions[]> {
    return this.prisma.roleAssignment.findMany({
      where: {
        userId,
        tenantId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
  }

  async findUserRoleAssignments(userId: string, tenantId: string): Promise<RoleAssignment[]> {
    return this.prisma.roleAssignment.findMany({
      where: {
        userId,
        tenantId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  /** True when the user holds at least one non-expired role assignment in the tenant. */
  async hasActiveTenantMembership(userId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.roleAssignment.count({
      where: {
        userId,
        tenantId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return count > 0;
  }

  /** Distinct tenant ids with at least one active role assignment. */
  async findDistinctActiveTenantIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.roleAssignment.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    return rows.map((row) => row.tenantId);
  }

  async findRoleAssignment(
    userId: string,
    roleId: string,
    tenantId: string,
  ): Promise<RoleAssignment | null> {
    return this.prisma.roleAssignment.findFirst({
      where: { userId, roleId, tenantId },
    });
  }

  async createRoleAssignment(input: {
    tenantId: string;
    userId: string;
    roleId: string;
    grantedBy: string | null;
    expiresAt: Date | null;
  }): Promise<RoleAssignment> {
    return this.prisma.roleAssignment.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        roleId: input.roleId,
        grantedBy: input.grantedBy,
        expiresAt: input.expiresAt,
      },
    });
  }

  async deleteRoleAssignment(userId: string, roleId: string, tenantId: string): Promise<void> {
    await this.prisma.roleAssignment.deleteMany({
      where: { userId, roleId, tenantId },
    });
  }

  async findRoleById(roleId: string): Promise<{ id: string; name: string; tenantId: string } | null> {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, tenantId: true },
    });
  }

  async findUserById(userId: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }
}
