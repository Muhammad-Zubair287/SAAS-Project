import { HttpStatus, Injectable } from '@nestjs/common';
import { type DocumentTemplate } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { DocumentTemplateRepository } from '../repositories/document-template.repository';
import type {
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  DocumentTemplateResponseDto,
} from '../dto/document-template.dto';
import type { ListDocumentsDto } from '../dto/list-documents.dto';

@Injectable()
export class DocumentTemplateService {
  constructor(
    private readonly repo: DocumentTemplateRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDocumentTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<DocumentTemplateResponseDto> {
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      return tx.documentTemplate.create({
        data: {
          tenantId,
          type: dto.type,
          name: dto.name,
          description: dto.description ?? null,
          isRequired: dto.isRequired ?? false,
          expiryMonths: dto.expiryMonths ?? null,
          isActive: dto.isActive ?? true,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });
    return this.toDto(created);
  }

  async findMany(
    query: ListDocumentsDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<DocumentTemplateResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<DocumentTemplateResponseDto> {
    const record = await this.repo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND,
        message: 'Document template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(record);
  }

  async update(
    id: string,
    dto: UpdateDocumentTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<DocumentTemplateResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND,
        message: 'Document template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const updated = await this.repo.update(id, tenantId, { ...dto, updatedBy: userId });
    return this.toDto(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND,
        message: 'Document template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    await this.repo.delete(id, tenantId);
  }

  private toDto(r: DocumentTemplate): DocumentTemplateResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      type: r.type,
      name: r.name,
      description: r.description,
      isRequired: r.isRequired,
      expiryMonths: r.expiryMonths,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      rowVersion: r.rowVersion.toString(),
    };
  }
}
