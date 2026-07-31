import { Injectable } from '@nestjs/common';
import type { ApiClient } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateApiClientInput {
  tenantId: string;
  name: string;
  tokenHash: string;
  scopes: string[];
  createdBy: string | null;
  expiresAt: Date | null;
}

@Injectable()
export class ApiClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ApiClient | null> {
    return this.prisma.apiClient.findUnique({ where: { id } });
  }

  async findAllByTenant(tenantId: string): Promise<ApiClient[]> {
    return this.prisma.apiClient.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateApiClientInput): Promise<ApiClient> {
    return this.prisma.apiClient.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        tokenHash: input.tokenHash,
        scopes: input.scopes,
        createdBy: input.createdBy,
        expiresAt: input.expiresAt,
      },
    });
  }

  async rotateSecret(id: string, newTokenHash: string): Promise<ApiClient> {
    return this.prisma.apiClient.update({
      where: { id },
      data: { tokenHash: newTokenHash },
    });
  }

  async disable(id: string): Promise<ApiClient> {
    return this.prisma.apiClient.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async enable(id: string): Promise<ApiClient> {
    return this.prisma.apiClient.update({
      where: { id },
      data: { revokedAt: null },
    });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.prisma.apiClient.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.apiClient.delete({ where: { id } });
  }
}
