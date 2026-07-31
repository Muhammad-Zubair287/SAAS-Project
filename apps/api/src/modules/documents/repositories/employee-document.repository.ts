import { Injectable } from '@nestjs/common';
import { type EmployeeDocument, type Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListDocumentsDto } from '../dto/list-documents.dto';

@Injectable()
export class EmployeeDocumentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<EmployeeDocument | null> {
    return this.prisma.employeeDocument.findFirst({ where: { id, tenantId } });
  }

  async findMany(
    query: ListDocumentsDto,
    tenantId: string,
    employeeId?: string,
  ): Promise<{ data: EmployeeDocument[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.EmployeeDocumentWhereInput = {
      tenantId,
      ...(employeeId ? { employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.documentType ? { documentType: query.documentType } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const orderBy: Prisma.EmployeeDocumentOrderByWithRelationInput =
      query.sortBy === 'title'
        ? { title: query.sortOrder ?? 'asc' }
        : query.sortBy === 'expiryDate'
          ? { expiryDate: query.sortOrder ?? 'asc' }
          : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.employeeDocument.findMany({ where, skip, take, orderBy }),
      this.prisma.employeeDocument.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.EmployeeDocumentCreateInput): Promise<EmployeeDocument> {
    return this.prisma.employeeDocument.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.EmployeeDocumentUpdateInput,
    expectedVersion?: bigint,
  ): Promise<EmployeeDocument> {
    return this.prisma.employeeDocument.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.employeeDocument.delete({ where: { id, tenantId } });
  }
}
