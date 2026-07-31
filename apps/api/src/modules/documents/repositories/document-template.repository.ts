import { Injectable } from '@nestjs/common';
import { type DocumentTemplate, type Prisma } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListDocumentsDto } from '../dto/list-documents.dto';

@Injectable()
export class DocumentTemplateRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, tenantId: string): Promise<DocumentTemplate | null> {
    return this.prisma.documentTemplate.findFirst({ where: { id, tenantId } });
  }

  async findMany(
    query: ListDocumentsDto,
    tenantId: string,
  ): Promise<{ data: DocumentTemplate[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.DocumentTemplateWhereInput = {
      tenantId,
      ...(query.status ? { isActive: query.status === 'active' } : {}),
      ...(query.documentType ? { type: query.documentType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.DocumentTemplateOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : query.sortBy === 'type'
          ? { type: query.sortOrder ?? 'asc' }
          : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.documentTemplate.findMany({ where, skip, take, orderBy }),
      this.prisma.documentTemplate.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.DocumentTemplateCreateInput): Promise<DocumentTemplate> {
    return this.prisma.documentTemplate.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.DocumentTemplateUpdateInput,
  ): Promise<DocumentTemplate> {
    return this.prisma.documentTemplate.update({
      where: { id, tenantId },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.documentTemplate.delete({ where: { id, tenantId } });
  }
}
