import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { AcknowledgePolicyDto } from '../dto/acknowledge-policy.dto';
import { EssContextService } from './ess-context.service';

@Injectable()
export class EssDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async listDocuments(tenantId: string, userId: string, page = 1, pageSize = 20) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const where = { tenantId, employeeId: employee.id };
    const [data, total] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employeeDocument.count({ where }),
    ]);
    return createPaginatedResponse(data.map((doc) => this.toDocumentDto(doc)), total, page, pageSize);
  }

  async getDocument(tenantId: string, userId: string, id: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const document = await this.prisma.employeeDocument.findFirst({
      where: { id, tenantId, employeeId: employee.id },
    });
    if (!document) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_DOCUMENT_NOT_FOUND,
        message: 'Employee document not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDocumentDto(document);
  }

  async acknowledgePolicy(tenantId: string, userId: string, dto: AcknowledgePolicyDto) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    if (dto.employeeDocumentId) {
      await this.getDocument(tenantId, userId, dto.employeeDocumentId);
    }

    const acknowledgement = await this.prisma.policyAcknowledgement.upsert({
      where: {
        tenantId_employeeId_policyKey_policyVersion: {
          tenantId,
          employeeId: employee.id,
          policyKey: dto.policyKey,
          policyVersion: dto.policyVersion,
        },
      },
      create: {
        tenantId,
        employeeId: employee.id,
        policyKey: dto.policyKey,
        policyTitle: dto.policyTitle,
        policyVersion: dto.policyVersion,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        summary: dto.summary ?? null,
        employeeDocumentId: dto.employeeDocumentId ?? null,
        acknowledgedAt: new Date(),
        acknowledgedByUserId: userId,
      },
      update: {
        policyTitle: dto.policyTitle,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        summary: dto.summary ?? null,
        employeeDocumentId: dto.employeeDocumentId ?? null,
        acknowledgedAt: new Date(),
        acknowledgedByUserId: userId,
      },
    });

    return {
      id: acknowledgement.id,
      policyKey: acknowledgement.policyKey,
      policyTitle: acknowledgement.policyTitle,
      policyVersion: acknowledgement.policyVersion,
      employeeDocumentId: acknowledgement.employeeDocumentId,
      acknowledgedAt: acknowledgement.acknowledgedAt.toISOString(),
    };
  }

  async listPoliciesPending(tenantId: string, userId: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const [documents, acknowledgements] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          OR: [
            { documentType: { contains: 'POLICY', mode: 'insensitive' } },
            { title: { contains: 'policy', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.policyAcknowledgement.findMany({
        where: { tenantId, employeeId: employee.id, employeeDocumentId: { not: null } },
        select: { employeeDocumentId: true },
      }),
    ]);

    const acknowledgedIds = new Set(
      acknowledgements
        .map((ack) => ack.employeeDocumentId)
        .filter((id): id is string => Boolean(id)),
    );

    return documents
      .filter((doc) => !acknowledgedIds.has(doc.id))
      .map((doc) => ({
        id: doc.id,
        policyKey: doc.id,
        policyTitle: doc.title,
        policyVersion: doc.rowVersion.toString(),
        documentType: doc.documentType,
        effectiveDate: doc.issuedDate?.toISOString().split('T')[0] ?? null,
      }));
  }

  private toDocumentDto(document: {
    id: string;
    employeeId: string;
    documentType: string;
    title: string;
    fileKey: string | null;
    fileSize: number | null;
    mimeType: string | null;
    expiryDate: Date | null;
    issuedDate: Date | null;
    issuedBy: string | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    rowVersion: bigint;
  }) {
    return {
      id: document.id,
      employeeId: document.employeeId,
      documentType: document.documentType,
      title: document.title,
      hasFile: Boolean(document.fileKey),
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      expiryDate: document.expiryDate?.toISOString().split('T')[0] ?? null,
      issuedDate: document.issuedDate?.toISOString().split('T')[0] ?? null,
      issuedBy: document.issuedBy,
      status: document.status,
      notes: document.notes,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      rowVersion: document.rowVersion.toString(),
    };
  }
}
