import { Injectable } from '@nestjs/common';
import type { AppUser, PasswordResetToken, UserInvitation } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateInvitationInput {
  tenantId: string;
  email: string;
  roleIds: string[];
  tokenHash: string;
  invitedBy: string | null;
  expiresAt: Date;
}

function parseRoleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmailNormalised(emailNormalised: string): Promise<AppUser | null> {
    return this.prisma.appUser.findFirst({ where: { emailNormalised } });
  }

  async findOrCreateUserForInvitation(
    emailNormalised: string,
    displayName?: string,
  ): Promise<AppUser> {
    const existing = await this.prisma.appUser.findFirst({ where: { emailNormalised } });
    if (existing) {
      if (displayName && existing.displayName !== displayName) {
        return this.prisma.appUser.update({
          where: { id: existing.id },
          data: { displayName, displayNameLegacy: displayName },
        });
      }
      return existing;
    }

    const resolvedName = displayName?.trim() || emailNormalised.split('@')[0] || emailNormalised;
    return this.prisma.appUser.create({
      data: {
        email: emailNormalised,
        emailNormalised,
        displayName: resolvedName,
        displayNameLegacy: resolvedName,
        userType: 'HUMAN',
        status: 'INVITED',
        isActive: false,
      },
    });
  }

  async createInvitation(input: CreateInvitationInput): Promise<UserInvitation> {
    return this.prisma.userInvitation.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        roleIds: input.roleIds,
        tokenHash: input.tokenHash,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
      },
    });
  }

  async listByTenant(tenantId: string): Promise<Array<{
    id: string;
    email: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
    roleIds: unknown;
  }>> {
    return this.prisma.userInvitation.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        roleIds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findInvitationByTokenHash(tokenHash: string): Promise<UserInvitation | null> {
    return this.prisma.userInvitation.findFirst({ where: { tokenHash } });
  }

  // Runs as a single atomic transaction: mark invitation accepted, upsert credential,
  // activate user, and assign invitation roleIds as RoleAssignments.
  async acceptInvitationTransaction(
    invitationId: string,
    userId: string,
    passwordHash: string,
    activateUser: boolean,
    roleIds: string[],
    tenantId: string,
    grantedBy: string | null,
  ): Promise<void> {
    await this.prisma.withTransaction(async (tx) => {
      await tx.userInvitation.update({
        where: { id: invitationId },
        data: { acceptedAt: new Date(), rowVersion: { increment: 1 } },
      });

      await tx.passwordCredential.deleteMany({ where: { userId } });
      await tx.passwordCredential.create({ data: { userId, passwordHash } });

      if (activateUser) {
        await tx.appUser.update({
          where: { id: userId },
          data: { status: 'ACTIVE', isActive: true },
        });
      }

      for (const roleId of roleIds) {
        const role = await tx.role.findFirst({
          where: { id: roleId, tenantId },
          select: { id: true },
        });
        if (!role) continue;

        const existing = await tx.roleAssignment.findFirst({
          where: { userId, roleId, tenantId },
        });
        if (existing) continue;

        await tx.roleAssignment.create({
          data: {
            tenantId,
            userId,
            roleId,
            grantedBy,
          },
        });
      }
    });
  }

  // ── Password reset token operations ──────────────────────────────────────────

  async findResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({ where: { tokenHash } });
  }

  async deleteUserResetTokens(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
  }

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  // Runs as a single atomic transaction: mark token used, replace credential, revoke all sessions.
  async resetPasswordTransaction(
    tokenId: string,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.withTransaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });

      await tx.passwordCredential.deleteMany({ where: { userId } });
      await tx.passwordCredential.create({ data: { userId, passwordHash } });

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }
}

export { parseRoleIds };
