import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { RbacRepository } from '../repositories/rbac.repository';
import { PermissionCacheService, type ResolvedPermissions } from './permission-cache.service';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';

// Synthetic permission grants for platform-level roles.
// Platform staff do not have tenant-scoped RoleAssignments; their access is
// governed by the platformRole string on AppUser.
const PLATFORM_ROLE_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  PLATFORM_SUPER_ADMIN: ['*'],
  PLATFORM_SUPPORT_ENGINEER: [
    'read:tenant:support',
    'read:subscription:support',
    'manage:subscription:support',
    'read:audit:support',
    'read:user:support',
  ],
  PLATFORM_AUDITOR: [
    'read:tenant:platform',
    'read:audit:platform',
    'read:user:platform',
  ],
};

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly rbacRepo: RbacRepository,
    private readonly cache: PermissionCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getEffectivePermissions(
    userId: string,
    tenantId: string | null,
    platformRole: string | null,
  ): Promise<ResolvedPermissions> {
    const cached = this.cache.get(userId, tenantId);
    if (cached) return cached;

    let permissions: string[];
    let roles: string[];

    if (platformRole && tenantId === null) {
      // Platform staff: permissions come from the role constant map.
      permissions = [...(PLATFORM_ROLE_PERMISSIONS[platformRole] ?? [])];
      roles = [platformRole];
    } else if (tenantId) {
      // Tenant user: load active role assignments + their permissions from DB.
      const assignments = await this.rbacRepo.findActiveRoleAssignmentsWithPermissions(
        userId,
        tenantId,
      );
      roles = assignments.map((a) => a.role.name);
      const permSet = new Set<string>();
      for (const assignment of assignments) {
        for (const rp of assignment.role.permissions) {
          const p = rp.permission;
          permSet.add(`${p.action}:${p.resource}:${p.scope}`);
        }
      }
      permissions = [...permSet];
    } else {
      permissions = [];
      roles = [];
    }

    const resolved: ResolvedPermissions = { permissions, roles };
    this.cache.set(userId, tenantId, resolved);
    return resolved;
  }

  // Returns true when the user holds the exact permission, or holds '*'.
  hasPermission(effectivePermissions: string[], permission: string): boolean {
    return effectivePermissions.includes('*') || effectivePermissions.includes(permission);
  }

  // Returns true when the user holds AT LEAST ONE of the listed permissions.
  hasAnyPermission(effectivePermissions: string[], permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(effectivePermissions, p));
  }

  // Returns true when the user holds ALL of the listed permissions.
  hasAllPermissions(effectivePermissions: string[], permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(effectivePermissions, p));
  }

  async emitPermissionDenied(
    user: CurrentUserContext,
    requiredPermissions: string[],
    correlationId: string,
  ): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.userId,
          actorType: 'USER',
          actorEmail: user.email,
          module: 'authentication',
          action: 'PERMISSION_DENIED',
          resourceType: 'permission',
          metadata: {
            requiredPermissions,
            effectivePermissions: user.effectivePermissions,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: 'WARNING',
        },
      });
    } catch {
      // Audit failure must never propagate.
    }
  }
}
