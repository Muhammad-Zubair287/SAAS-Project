import { Injectable } from '@nestjs/common';
import { type EmployeePersonalDetail, type Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PersonalDetailRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByEmployeeId(
    employeeId: string,
    tenantId: string,
  ): Promise<EmployeePersonalDetail | null> {
    return this.prisma.employeePersonalDetail.findFirst({
      where: { employeeId, tenantId },
    });
  }

  async upsert(
    employeeId: string,
    tenantId: string,
    data: Omit<Prisma.EmployeePersonalDetailCreateInput, 'tenant' | 'employee'>,
  ): Promise<EmployeePersonalDetail> {
    return this.prisma.employeePersonalDetail.upsert({
      where: { employeeId },
      create: {
        ...data,
        tenant: { connect: { id: tenantId } },
        employee: { connect: { id: employeeId } },
      },
      update: {
        ...data,
        rowVersion: { increment: 1 },
      },
    });
  }
}
