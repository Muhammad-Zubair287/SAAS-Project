import { Injectable } from '@nestjs/common';
import { type Prisma, type Shift } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListShiftsDto } from '../dto';

export interface CreateShiftData {
  tenantId: string;
  code: string;
  name: string;
  version: number;
  status: string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight: boolean;
  requiredMinutes: number;
  breakMinutes: number;
  breakPaid: boolean;
  checkInWindowBeforeMinutes: number;
  checkInWindowAfterMinutes: number;
  checkOutWindowAfterMinutes: number;
  attendancePolicyId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

@Injectable()
export class ShiftRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<Shift | null> {
    return this.prisma.shift.findFirst({
      where: { id, tenantId },
    });
  }

  async findLatestByCode(tenantId: string, code: string): Promise<Shift | null> {
    return this.prisma.shift.findFirst({
      where: { tenantId, code },
      orderBy: { version: 'desc' },
    });
  }

  async findVersion(
    tenantId: string,
    code: string,
    version: number,
  ): Promise<Shift | null> {
    return this.prisma.shift.findFirst({
      where: { tenantId, code, version },
    });
  }

  async findMany(
    tenantId: string,
    query: ListShiftsDto,
  ): Promise<{ data: Shift[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = toPrismaSkipTake({ page, pageSize });

    const where: Prisma.ShiftWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.shift.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.shift.count({ where }),
    ]);

    return { data, total };
  }

  async create(
    data: CreateShiftData,
    tx?: Prisma.TransactionClient,
  ): Promise<Shift> {
    const client = tx ?? this.prisma;
    return client.shift.create({ data });
  }

  async updateWithVersion(
    id: string,
    tenantId: string,
    expectedRowVersion: bigint,
    data: Prisma.ShiftUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Shift> {
    const client = tx ?? this.prisma;
    return client.shift.update({
      where: {
        id,
        tenantId,
        rowVersion: expectedRowVersion,
      } as Prisma.ShiftWhereUniqueInput,
      data: {
        ...data,
        rowVersion: { increment: 1 },
      },
    });
  }
}
