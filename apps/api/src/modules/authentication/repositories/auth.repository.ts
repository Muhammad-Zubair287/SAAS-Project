import { Injectable } from '@nestjs/common';
import type { AppUser, PasswordCredential, Session } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

export type UserWithCredential = AppUser & {
  passwordCredential: PasswordCredential | null;
};

export interface CreateSessionInput {
  id: string;
  userId: string;
  tenantId: string | null;
  refreshTokenHash: string;
  refreshTokenFamily: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  idleExpiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(emailNormalised: string): Promise<UserWithCredential | null> {
    return this.prisma.appUser.findFirst({
      where: { emailNormalised },
      include: { passwordCredential: true },
    });
  }

  async findUserById(id: string): Promise<AppUser | null> {
    return this.prisma.appUser.findUnique({ where: { id } });
  }

  async findSessionById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        tenantId: input.tenantId,
        refreshTokenHash: input.refreshTokenHash,
        refreshTokenFamily: input.refreshTokenFamily,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
        idleExpiresAt: input.idleExpiresAt,
      },
    });
  }

  async revokeSession(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeSessionFamily(family: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenFamily: family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotateSession(oldId: string, newInput: CreateSessionInput): Promise<Session> {
    return this.prisma.withTransaction(async (tx) => {
      await tx.session.update({
        where: { id: oldId },
        data: { revokedAt: new Date() },
      });
      return tx.session.create({
        data: {
          id: newInput.id,
          userId: newInput.userId,
          tenantId: newInput.tenantId,
          refreshTokenHash: newInput.refreshTokenHash,
          refreshTokenFamily: newInput.refreshTokenFamily,
          userAgent: newInput.userAgent,
          ipAddress: newInput.ipAddress,
          expiresAt: newInput.expiresAt,
          idleExpiresAt: newInput.idleExpiresAt,
        },
      });
    });
  }

  async findTenantStatus(id: string): Promise<{ status: string } | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: { status: true },
    });
  }

  /** Resolve public tenant slug → id for tenant-specific login URLs. */
  async findTenantIdBySlug(slug: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return tenant?.id ?? null;
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.appUser.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessionsExcept(userId: string, exceptSessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: exceptSessionId } },
      data: { revokedAt: new Date() },
    });
  }
}
