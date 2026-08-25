import { Injectable } from '@nestjs/common';
import { type Prisma, type AttendanceCaptureAudit } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';

export interface FindManyAuditQuery {
  page?: number;
  pageSize?: number;
  auditType?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AttendanceCaptureAuditRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceCaptureAudit | null> {
    return this.prisma.attendanceCaptureAudit.findFirst({
      where: { id, tenantId },
    });
  }

  async findByTargetId(targetId: string, tenantId: string): Promise<AttendanceCaptureAudit[]> {
    return this.prisma.attendanceCaptureAudit.findMany({
      where: { targetId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByActor(actorId: string, tenantId: string): Promise<AttendanceCaptureAudit[]> {
    return this.prisma.attendanceCaptureAudit.findMany({
      where: { actorId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.AttendanceCaptureAuditCreateInput, 'tenant'>,
  ): Promise<AttendanceCaptureAudit> {
    return this.prisma.attendanceCaptureAudit.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.attendanceCaptureAudit.delete({
      where: { id },
    });
  }

  async findMany(
    tenantId: string,
    query: FindManyAuditQuery,
  ): Promise<{ data: AttendanceCaptureAudit[]; total: number }> {
    const { skip, take } = toPrismaSkipTake({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.AttendanceCaptureAuditWhereInput = {
      tenantId,
      ...(query.auditType ? { auditType: query.auditType } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceCaptureAudit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
      }),
      this.prisma.attendanceCaptureAudit.count({ where }),
    ]);

    return { data, total };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.attendanceCaptureAudit.count({ where: { tenantId } });
  }

  async countByType(tenantId: string, auditType: string): Promise<number> {
    return this.prisma.attendanceCaptureAudit.count({
      where: { tenantId, auditType },
    });
  }

  async countByActor(actorId: string, tenantId: string): Promise<number> {
    return this.prisma.attendanceCaptureAudit.count({
      where: { actorId, tenantId },
    });
  }

  async existsById(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.attendanceCaptureAudit.count({
      where: { id, tenantId },
    });
    return count > 0;
  }

  async findInDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<AttendanceCaptureAudit[]> {
    return this.prisma.attendanceCaptureAudit.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteOldAudit(tenantId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.attendanceCaptureAudit.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: beforeDate },
      },
    });
    return result.count;
  }
}
