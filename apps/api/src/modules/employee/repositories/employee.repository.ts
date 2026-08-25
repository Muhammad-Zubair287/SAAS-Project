import { Injectable } from '@nestjs/common';
import { type Employee, type Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListEmployeesDto } from '../dto/list-employees.dto';

@Injectable()
export class EmployeeRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<Employee | null> {
    return this.prisma.employee.findFirst({ where: { id, tenantId } });
  }

  async findByEmailWork(emailWork: string, tenantId: string): Promise<Employee | null> {
    return this.prisma.employee.findFirst({
      where: { emailWork: { equals: emailWork, mode: 'insensitive' }, tenantId },
    });
  }

  async findByNumber(
    employeeNumber: string,
    tenantId: string,
    legalEntityId: string,
  ): Promise<Employee | null> {
    return this.prisma.employee.findFirst({
      where: { employeeNumber, tenantId, legalEntityId },
    });
  }

  async findMany(
    query: ListEmployeesDto,
    tenantId: string,
  ): Promise<{ data: Employee[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const statusFilter = query.status;

    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.managerId ? { managerId: query.managerId } : {}),
      ...(query.positionId ? { positionId: query.positionId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.hireDateFrom || query.hireDateTo
        ? {
            hireDate: {
              ...(query.hireDateFrom ? { gte: new Date(query.hireDateFrom) } : {}),
              ...(query.hireDateTo ? { lte: new Date(query.hireDateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { emailWork: { contains: query.search, mode: 'insensitive' } },
              { employeeNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.EmployeeOrderByWithRelationInput =
      query.sortBy === 'employeeNumber'
        ? { employeeNumber: query.sortOrder ?? 'asc' }
        : query.sortBy === 'firstName'
          ? { firstName: query.sortOrder ?? 'asc' }
          : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({ where, skip, take, orderBy }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.EmployeeCreateInput): Promise<Employee> {
    return this.prisma.employee.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.EmployeeUpdateInput,
    expectedVersion?: bigint,
  ): Promise<Employee> {
    return this.prisma.employee.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

}
