import { Injectable } from '@nestjs/common';
import {
  type DocumentRequest,
  type DocumentRequestItem,
  type Prisma,
} from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListDocumentRequestsDto } from '../dto/list-documents.dto';

export type DocumentRequestWithItems = DocumentRequest & {
  items: DocumentRequestItem[];
};

@Injectable()
export class DocumentRequestRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<DocumentRequestWithItems | null> {
    return this.prisma.documentRequest.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
  }

  async findItemById(
    itemId: string,
    requestId: string,
    tenantId: string,
  ): Promise<DocumentRequestItem | null> {
    return this.prisma.documentRequestItem.findFirst({
      where: { id: itemId, documentRequestId: requestId, tenantId },
    });
  }

  async findMany(
    query: ListDocumentRequestsDto,
    tenantId: string,
  ): Promise<{ data: DocumentRequest[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.DocumentRequestWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy: Prisma.DocumentRequestOrderByWithRelationInput =
      query.sortBy === 'title'
        ? { title: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.documentRequest.findMany({ where, skip, take, orderBy }),
      this.prisma.documentRequest.count({ where }),
    ]);

    return { data, total };
  }

  async create(
    data: Prisma.DocumentRequestCreateInput,
  ): Promise<DocumentRequest> {
    return this.prisma.documentRequest.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.DocumentRequestUpdateInput,
    expectedVersion?: bigint,
  ): Promise<DocumentRequest> {
    return this.prisma.documentRequest.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async createItem(
    data: Prisma.DocumentRequestItemCreateInput,
  ): Promise<DocumentRequestItem> {
    return this.prisma.documentRequestItem.create({ data });
  }

  async updateItem(
    itemId: string,
    tenantId: string,
    data: Prisma.DocumentRequestItemUpdateInput,
  ): Promise<DocumentRequestItem> {
    return this.prisma.documentRequestItem.update({
      where: { id: itemId, tenantId },
      data,
    });
  }
}
