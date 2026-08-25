import { HttpStatus, Injectable } from '@nestjs/common';
import { type EmployeeDocument } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { EmployeeDocumentRepository } from '../repositories/employee-document.repository';
import type {
  CreateEmployeeDocumentDto,
  UpdateEmployeeDocumentDto,
  EmployeeDocumentResponseDto,
} from '../dto/employee-document.dto';
import type { ListDocumentsDto } from '../dto/list-documents.dto';

@Injectable()
export class EmployeeDocumentService {
  constructor(
    private readonly repo: EmployeeDocumentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateEmployeeDocumentDto,
    userId: string,
    tenantId: string,
  ): Promise<EmployeeDocumentResponseDto> {
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      return tx.employeeDocument.create({
        data: {
          tenantId,
          employeeId,
          templateId: dto.templateId ?? null,
          documentType: dto.documentType,
          title: dto.title,
          fileKey: dto.fileKey ?? null,
          fileSize: dto.fileSize ?? null,
          mimeType: dto.mimeType ?? null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null,
          issuedBy: dto.issuedBy ?? null,
          status: 'PENDING',
          notes: dto.notes ?? null,
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
    employeeId?: string,
  ): Promise<ApiSuccessResponse<EmployeeDocumentResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId, employeeId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<EmployeeDocumentResponseDto> {
    const record = await this.repo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_DOCUMENT_NOT_FOUND,
        message: 'Employee document not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(record);
  }

  async update(
    id: string,
    dto: UpdateEmployeeDocumentDto,
    userId: string,
    tenantId: string,
    ifMatch?: string,
  ): Promise<EmployeeDocumentResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_DOCUMENT_NOT_FOUND,
        message: 'Employee document not found.',
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

    const updated = await this.repo.update(id, tenantId, {
      ...dto,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
      updatedBy: userId,
    }, expectedVersion);
    return this.toDto(updated);
  }

  async approve(
    id: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<EmployeeDocumentResponseDto> {
    await this.findById(id, tenantId);
    const updated = await this.repo.update(
      id,
      tenantId,
      {
        status: 'ACTIVE',
        notes: notes ?? undefined,
        updatedBy: userId,
      },
    );
    return this.toDto(updated);
  }

  async reject(
    id: string,
    userId: string,
    tenantId: string,
    reason: string,
  ): Promise<EmployeeDocumentResponseDto> {
    await this.findById(id, tenantId);
    const updated = await this.repo.update(
      id,
      tenantId,
      {
        status: 'REJECTED',
        notes: reason,
        updatedBy: userId,
      },
    );
    return this.toDto(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_DOCUMENT_NOT_FOUND,
        message: 'Employee document not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    await this.repo.delete(id, tenantId);
  }

  private toDto(r: EmployeeDocument): EmployeeDocumentResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      templateId: r.templateId,
      documentType: r.documentType,
      title: r.title,
      fileKey: r.fileKey,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      expiryDate: r.expiryDate ? r.expiryDate.toISOString().split('T')[0] ?? null : null,
      issuedDate: r.issuedDate ? r.issuedDate.toISOString().split('T')[0] ?? null : null,
      issuedBy: r.issuedBy,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      rowVersion: r.rowVersion.toString(),
    };
  }
}
