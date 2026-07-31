import { Injectable } from '@nestjs/common';
import { PrismaClient, type Prisma, type SupportGrant, SupportGrantStatus } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class SupportGrantRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<SupportGrant | null> {
    return this.prisma.supportGrant.findUnique({ where: { id } });
  }

  async findByTenantId(tenantId: string): Promise<SupportGrant[]> {
    return this.prisma.supportGrant.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.SupportGrantCreateInput): Promise<SupportGrant> {
    return this.prisma.supportGrant.create({ data });
  }

  async createWithTx(tx: PrismaTx, data: Prisma.SupportGrantCreateInput): Promise<SupportGrant> {
    return tx.supportGrant.create({ data });
  }

  async revoke(id: string, revokedBy: string, reason: string): Promise<SupportGrant> {
    return this._revoke(this.prisma, id, revokedBy, reason);
  }

  async revokeWithTx(tx: PrismaTx, id: string, revokedBy: string, reason: string): Promise<SupportGrant> {
    return this._revoke(tx, id, revokedBy, reason);
  }

  private async _revoke(client: PrismaTx, id: string, revokedBy: string, reason: string): Promise<SupportGrant> {
    return client.supportGrant.update({
      where: { id },
      data: {
        status: SupportGrantStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
        rowVersion: { increment: 1 },
      },
    });
  }

  async expireStale(): Promise<number> {
    const result = await this.prisma.supportGrant.updateMany({
      where: {
        status: SupportGrantStatus.ACTIVE,
        endsAt: { lt: new Date() },
      },
      data: { status: SupportGrantStatus.EXPIRED },
    });
    return result.count;
  }
}
