import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceDeviceToken } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyTokensQuery {
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceDeviceTokenRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceDeviceToken | null> {
    return this.prisma.attendanceDeviceToken.findFirst({
      where: { id, tenantId },
    });
  }

  async findByHash(tokenHash: string, tenantId: string): Promise<AttendanceDeviceToken | null> {
    return this.prisma.attendanceDeviceToken.findFirst({
      where: { tokenHash, tenantId },
    });
  }

  async findByDeviceId(deviceId: string, tenantId: string): Promise<AttendanceDeviceToken[]> {
    return this.prisma.attendanceDeviceToken.findMany({
      where: { deviceId, tenantId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceDeviceTokenCreateInput, 'tenant' | 'device'> & {
      deviceId: string;
    },
  ): Promise<AttendanceDeviceToken> {
    return this.prisma.attendanceDeviceToken.create({
      data: {
        tokenHash: data.tokenHash,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        rotatedAt: data.rotatedAt,
        revokedAt: data.revokedAt,
        createdBy: data.createdBy,
        device: { connect: { id: data.deviceId } },
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async rotateToken(id: string, tenantId: string, newTokenHash: string): Promise<AttendanceDeviceToken> {
    return this.prisma.attendanceDeviceToken.update({
      where: { id },
      data: {
        tokenHash: newTokenHash,
        rotatedAt: new Date(),
      },
    });
  }

  async revokeToken(id: string, tenantId: string): Promise<AttendanceDeviceToken> {
    return this.prisma.attendanceDeviceToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async findActiveToken(deviceId: string, tenantId: string): Promise<AttendanceDeviceToken | null> {
    return this.prisma.attendanceDeviceToken.findFirst({
      where: {
        deviceId,
        tenantId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyTokensQuery,
  ): Promise<{ data: AttendanceDeviceToken[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceDeviceTokenWhereInput = { tenantId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceDeviceToken.findMany({
        where,
        skip,
        take,
        orderBy: { issuedAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceDeviceToken.count({ where }),
    ]);

    return { data, total };
  }

  async countByDevice(deviceId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceDeviceToken.count({
      where: { deviceId, tenantId },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceDeviceToken.delete({
      where: { id },
    });
  }

  async deleteExpiredTokens(tenantId: string): Promise<number> {
    const result = await this.prisma.attendanceDeviceToken.deleteMany({
      where: {
        tenantId,
        expiresAt: { lt: new Date() },
        revokedAt: { not: null },
      },
    });
    return result.count;
  }
}
