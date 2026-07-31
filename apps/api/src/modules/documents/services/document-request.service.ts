import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type DocumentRequest,
  type DocumentRequestItem,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import {
  DocumentRequestRepository,
  type DocumentRequestWithItems,
} from '../repositories/document-request.repository';
import type {
  CreateDocumentRequestDto,
  UpdateDocumentRequestDto,
  UpdateDocumentRequestItemDto,
  DocumentRequestResponseDto,
  DocumentRequestItemResponseDto,
} from '../dto/document-request.dto';
import type { ListDocumentRequestsDto } from '../dto/list-documents.dto';

@Injectable()
export class DocumentRequestService {
  constructor(
    private readonly repo: DocumentRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDocumentRequestDto,
    userId: string,
    tenantId: string,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.documentRequest.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          requestedBy: userId,
          title: dto.title,
          message: dto.message ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: 'PENDING',
        },
      });

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          await tx.documentRequestItem.create({
            data: {
              tenantId,
              documentRequestId: created.id,
              documentTemplateId: item.documentTemplateId ?? null,
              title: item.title,
              isRequired: item.isRequired ?? true,
              status: 'PENDING',
            },
          });
        }
      }

      return created;
    });

    return this.toDto(request);
  }

  async findMany(
    query: ListDocumentRequestsDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<DocumentRequestResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<DocumentRequestResponseDto> {
    const record = await this.repo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_REQUEST_NOT_FOUND,
        message: 'Document request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDtoWithItems(record);
  }

  async update(
    id: string,
    dto: UpdateDocumentRequestDto,
    tenantId: string,
    ifMatch?: string,
  ): Promise<DocumentRequestResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_REQUEST_NOT_FOUND,
        message: 'Document request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const expectedVersion = ifMatch ? BigInt(ifMatch) : undefined;
    if (expectedVersion !== undefined && existing.rowVersion !== expectedVersion) {
      throw new AppException({
        code: ERROR_CODES.VERSION_CONFLICT,
        message: 'Concurrent modification detected. Reload and try again.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const updated = await this.repo.update(id, tenantId, dto, expectedVersion);
    return this.toDto(updated);
  }

  async updateItem(
    requestId: string,
    itemId: string,
    dto: UpdateDocumentRequestItemDto,
    tenantId: string,
  ): Promise<DocumentRequestItemResponseDto> {
    const request = await this.repo.findById(requestId, tenantId);
    if (!request) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_REQUEST_NOT_FOUND,
        message: 'Document request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const item = await this.repo.findItemById(itemId, requestId, tenantId);
    if (!item) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_REQUEST_ITEM_NOT_FOUND,
        message: 'Document request item not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const updatedItem = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const updated = await tx.documentRequestItem.update({
        where: { id: itemId, tenantId },
        data: {
          employeeDocumentId: dto.employeeDocumentId ?? item.employeeDocumentId,
          status: dto.status ?? item.status,
        },
      });

      // Recompute parent request status
      const allItems = await tx.documentRequestItem.findMany({
        where: { documentRequestId: requestId, tenantId },
      });
      const updatedItems = allItems.map((i) => (i.id === itemId ? updated : i));
      const allSubmitted = updatedItems.every(
        (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED' || !i.isRequired,
      );
      const anySubmitted = updatedItems.some(
        (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED',
      );
      const allApproved = updatedItems
        .filter((i) => i.isRequired)
        .every((i) => i.status === 'APPROVED');

      let newStatus = request.status;
      if (allApproved) {
        newStatus = 'COMPLETED';
      } else if (anySubmitted && !allSubmitted) {
        newStatus = 'PARTIAL';
      } else if (allSubmitted) {
        newStatus = 'COMPLETED';
      }

      if (newStatus !== request.status) {
        await tx.documentRequest.update({
          where: { id: requestId, tenantId },
          data: { status: newStatus, rowVersion: { increment: 1 } },
        });
      }

      return updated;
    });

    return this.toItemDto(updatedItem);
  }

  private toDto(r: DocumentRequest): DocumentRequestResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      requestedBy: r.requestedBy,
      title: r.title,
      message: r.message,
      dueDate: r.dueDate ? r.dueDate.toISOString().split('T')[0] ?? null : null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      rowVersion: r.rowVersion.toString(),
    };
  }

  private toDtoWithItems(r: DocumentRequestWithItems): DocumentRequestResponseDto {
    return {
      ...this.toDto(r),
      items: r.items.map((i) => this.toItemDto(i)),
    };
  }

  private toItemDto(i: DocumentRequestItem): DocumentRequestItemResponseDto {
    return {
      id: i.id,
      tenantId: i.tenantId,
      documentRequestId: i.documentRequestId,
      documentTemplateId: i.documentTemplateId,
      title: i.title,
      isRequired: i.isRequired,
      employeeDocumentId: i.employeeDocumentId,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }
}
