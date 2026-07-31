import { Injectable } from '@nestjs/common';
import type { MfaCredential, PasswordCredential } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateMfaCredentialInput {
  userId: string;
  tenantId: string;
  credentialType: string;
  secretEncrypted: string;
}

@Injectable()
export class MfaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveCredential(userId: string): Promise<MfaCredential | null> {
    return this.prisma.mfaCredential.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
  }

  async findPendingCredential(userId: string): Promise<MfaCredential | null> {
    return this.prisma.mfaCredential.findFirst({
      where: { userId, status: 'PENDING' },
    });
  }

  async createCredential(input: CreateMfaCredentialInput): Promise<MfaCredential> {
    return this.prisma.mfaCredential.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        credentialType: input.credentialType,
        secretEncrypted: input.secretEncrypted,
        status: 'PENDING',
        backupCodesEncrypted: [],
      },
    });
  }

  async deletePendingCredential(userId: string): Promise<void> {
    await this.prisma.mfaCredential.deleteMany({
      where: { userId, status: 'PENDING' },
    });
  }

  async enableCredential(
    id: string,
    backupCodesEncrypted: string[],
    verifiedAt: Date,
  ): Promise<void> {
    await this.prisma.mfaCredential.update({
      where: { id },
      data: { status: 'ACTIVE', verifiedAt, backupCodesEncrypted },
    });
  }

  async disableCredential(id: string): Promise<void> {
    await this.prisma.mfaCredential.update({
      where: { id },
      data: { status: 'DISABLED' },
    });
  }

  async updateBackupCodes(id: string, backupCodesEncrypted: string[]): Promise<void> {
    await this.prisma.mfaCredential.update({
      where: { id },
      data: { backupCodesEncrypted },
    });
  }

  async findPasswordCredentialByUserId(userId: string): Promise<PasswordCredential | null> {
    return this.prisma.passwordCredential.findUnique({ where: { userId } });
  }
}
