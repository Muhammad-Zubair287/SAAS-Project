import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { RbacRepository } from '../repositories/rbac.repository';
import { PermissionCacheService, type ResolvedPermissions } from './permission-cache.service';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLE_PERMISSIONS,
} from '../../../common/constants/permissions.constants';
import { PlatformRole } from '../../../common/enums/platform.enum';

function resolvePlatformRolePermissions(platformRole: string): string[] {
  // Accept both PLATFORM_SUPER_ADMIN and SUPER_ADMIN style codes.
  const normalized =
    platformRole === 'SUPER_ADMIN'
      ? PlatformRole.SUPER_ADMIN
      : platformRole === 'SUPPORT_ENGINEER'
        ? PlatformRole.SUPPORT_ENGINEER
        : platformRole === 'AUDITOR'
          ? PlatformRole.AUDITOR
          : platformRole === 'OPERATIONS'
            ? PlatformRole.OPERATIONS
            : platformRole;

  const mapped = PLATFORM_ROLE_PERMISSIONS[normalized as PlatformRole];
  if (mapped) return [...mapped];

  // Legacy fallback: keep wildcard for unmatched SUPER_ADMIN aliases
  if (platformRole.includes('SUPER_ADMIN')) {
    return Object.values(PLATFORM_PERMISSIONS);
  }
  return [];
}

/**
 * Permission catalogue rows are stored as (action, resource, scope).
 * - Colon form (M03/M04): action=read, resource=employee, scope=tenant → "read:employee:tenant"
 * - Dot form (M06 capture/policy contract): action=<full code>, resource=".", scope="." → "attendance.device.read"
 */
export function formatPermissionCode(p: {
  action: string;
  resource: string;
  scope: string;
}): string {
  if (p.resource === '.' && p.scope === '.') {
    return p.action;
  }
  return `${p.action}:${p.resource}:${p.scope}`;
}

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
      // Platform staff: permissions come from the shared platform role map.
      permissions = resolvePlatformRolePermissions(platformRole);
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
          permSet.add(formatPermissionCode(rp.permission));
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
