import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeNumberGenerator } from './employee-number-generator.service';
import type {
  ChangeEmployeeStatusDto,
  CreateCompensationDto,
  CreateEmergencyContactDto,
  StartEmployeeImportDto,
  TransferEmployeeDto,
  UpdateEmergencyContactDto,
} from '../dto/employee-lifecycle.dto';

const HIGH_IMPACT_STATUSES = new Set([
  'SUSPENDED',
  'RESIGNED',
  'TERMINATED',
  'RETIRED',
  'INACTIVE',
]);

@Injectable()
export class EmployeeLifecycleService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly prisma: PrismaService,
    private readonly numberGenerator: EmployeeNumberGenerator,
  ) {}

  async getCurrentEmployment(employeeId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const row = await this.prisma.employmentRecord.findFirst({
      where: { tenantId, employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!row) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYMENT_NOT_FOUND,
        message: 'No current employment record found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.employmentToDto(row);
  }

  async listEmploymentHistory(employeeId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const rows = await this.prisma.employmentRecord.findMany({
      where: { tenantId, employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
    return rows.map((r) => this.employmentToDto(r));
  }

  async transfer(
    employeeId: string,
    dto: TransferEmployeeDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    const employee = await this.assertEmployee(employeeId, tenantId);
    if (employee.status === 'TERMINATED') {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        message: 'Cannot transfer a terminated employee.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const managerId = dto.managerId === undefined ? employee.managerId : dto.managerId;
    if (managerId) {
      await this.assertNoManagerCycle(employeeId, managerId, tenantId);
    }

    const effectiveFrom = new Date(dto.effectiveDate);
    const dayBefore = new Date(effectiveFrom);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

    const result = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.employmentRecord.findFirst({
        where: { tenantId, employeeId, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (current) {
        await tx.employmentRecord.update({
          where: { id: current.id },
          data: { effectiveTo: dayBefore, updatedBy: userId },
        });
      }

      const nextLegalEntityId = dto.legalEntityId ?? employee.legalEntityId;
      const nextBranchId = dto.branchId !== undefined ? dto.branchId : employee.branchId;
      const nextDepartmentId =
        dto.departmentId !== undefined ? dto.departmentId : employee.departmentId;
      const nextPositionId = dto.positionId !== undefined ? dto.positionId : employee.positionId;
      const nextCostCentreId =
        dto.costCentreId !== undefined ? dto.costCentreId : employee.costCentreId;
      const nextGradeId = dto.gradeId !== undefined ? dto.gradeId : employee.gradeId;

      const employment = await tx.employmentRecord.create({
        data: {
          tenantId,
          employeeId,
          legalEntityId: nextLegalEntityId,
          branchId: nextBranchId,
          departmentId: nextDepartmentId,
          positionId: nextPositionId,
          managerId,
          costCentreId: nextCostCentreId,
          gradeId: nextGradeId,
          employmentType: employee.employmentType,
          changeReason: dto.reason ?? null,
          changeType: 'TRANSFER',
          effectiveFrom,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const updated = await tx.employee.update({
        where: { id: employeeId, tenantId },
        data: {
          legalEntityId: nextLegalEntityId,
          branchId: nextBranchId,
          departmentId: nextDepartmentId,
          positionId: nextPositionId,
          managerId,
          costCentreId: nextCostCentreId,
          gradeId: nextGradeId,
          updatedBy: userId,
          rowVersion: { increment: 1 },
        },
      });

      await tx.employeeTimelineEvent.create({
        data: {
          tenantId,
          employeeId,
          eventType: 'TRANSFER',
          summary: `Organisation assignment changed effective ${dto.effectiveDate}`,
          metadata: {
            before: {
              legalEntityId: employee.legalEntityId,
              departmentId: employee.departmentId,
              positionId: employee.positionId,
              managerId: employee.managerId,
              branchId: employee.branchId,
            },
            after: {
              legalEntityId: nextLegalEntityId,
              departmentId: nextDepartmentId,
              positionId: nextPositionId,
              managerId,
              branchId: nextBranchId,
            },
            reason: dto.reason ?? null,
          },
          occurredAt: effectiveFrom,
          actorId: userId,
          visibility: 'HR',
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.transferred',
          resourceType: 'employee',
          resourceId: employeeId,
          after: { employmentId: employment.id, effectiveDate: dto.effectiveDate },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'EmployeeTransferred.v1',
          payload: {
            employeeId,
            employmentId: employment.id,
            tenantId,
            actorId: userId,
            correlationId,
            effectiveDate: dto.effectiveDate,
          },
        },
      });

      return { employment, employee: updated };
    });

    return {
      employment: this.employmentToDto(result.employment),
      impact: {
        shiftImpact: 'Review default shift assignment if location changed.',
        managerAccessImpact: managerId !== employee.managerId,
        attendancePolicyImpact: false,
      },
    };
  }

  async changeStatus(
    employeeId: string,
    dto: ChangeEmployeeStatusDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    const employee = await this.assertEmployee(employeeId, tenantId);
    const status = dto.status.toUpperCase();
    const effectiveDate = new Date(dto.effectiveDate);

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const u = await tx.employee.update({
        where: { id: employeeId, tenantId },
        data: {
          status,
          statusReason: dto.reason ?? null,
          lastWorkingDate: dto.lastWorkingDate ? new Date(dto.lastWorkingDate) : null,
          accessDisableDate: dto.accessDisableDate ? new Date(dto.accessDisableDate) : null,
          terminationDate:
            status === 'TERMINATED' || status === 'RESIGNED' || status === 'RETIRED'
              ? effectiveDate
              : employee.terminationDate,
          updatedBy: userId,
          rowVersion: { increment: 1 },
        },
      });

      await tx.employeeTimelineEvent.create({
        data: {
          tenantId,
          employeeId,
          eventType: 'STATUS_CHANGE',
          summary: `Status changed from ${employee.status} to ${status}`,
          metadata: {
            before: employee.status,
            after: status,
            reason: dto.reason ?? null,
            highImpact: HIGH_IMPACT_STATUSES.has(status),
            notes: dto.notes ?? null,
          },
          occurredAt: effectiveDate,
          actorId: userId,
          visibility: 'HR',
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.status_changed',
          resourceType: 'employee',
          resourceId: employeeId,
          before: { status: employee.status },
          after: { status, reason: dto.reason ?? null },
          correlationId,
          severity: HIGH_IMPACT_STATUSES.has(status)
            ? AuditEventSeverity.WARNING
            : AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'EmployeeStatusChanged.v1',
          payload: {
            employeeId,
            tenantId,
            fromStatus: employee.status,
            toStatus: status,
            actorId: userId,
            correlationId,
          },
        },
      });

      return u;
    });

    return {
      id: updated.id,
      status: updated.status,
      statusReason: updated.statusReason,
      lastWorkingDate: updated.lastWorkingDate?.toISOString().split('T')[0] ?? null,
      accessDisableDate: updated.accessDisableDate?.toISOString().split('T')[0] ?? null,
      terminationDate: updated.terminationDate?.toISOString().split('T')[0] ?? null,
    };
  }

  async getTimeline(employeeId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const events = await this.prisma.employeeTimelineEvent.findMany({
      where: { tenantId, employeeId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      summary: e.summary,
      metadata: e.metadata,
      occurredAt: e.occurredAt.toISOString(),
      actorId: e.actorId,
      visibility: e.visibility,
    }));
  }

  async listCompensation(employeeId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const rows = await this.prisma.compensationRecord.findMany({
      where: { tenantId, employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
    return rows.map((r) => this.compensationToDto(r));
  }

  async addCompensation(
    employeeId: string,
    dto: CreateCompensationDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    await this.assertEmployee(employeeId, tenantId);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const dayBefore = new Date(effectiveFrom);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

    const row = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.compensationRecord.findFirst({
        where: { tenantId, employeeId, effectiveTo: null },
      });
      if (current) {
        await tx.compensationRecord.update({
          where: { id: current.id },
          data: { effectiveTo: dayBefore, updatedBy: userId },
        });
      }

      const created = await tx.compensationRecord.create({
        data: {
          tenantId,
          employeeId,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency.toUpperCase(),
          payFrequency: dto.payFrequency ?? 'MONTHLY',
          effectiveFrom,
          notes: dto.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.employeeTimelineEvent.create({
        data: {
          tenantId,
          employeeId,
          eventType: 'SALARY_CHANGE',
          summary: `Compensation updated effective ${dto.effectiveFrom}`,
          metadata: {
            amount: dto.amount,
            currency: dto.currency,
            payFrequency: dto.payFrequency ?? 'MONTHLY',
          },
          occurredAt: effectiveFrom,
          actorId: userId,
          visibility: 'HR',
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.compensation_added',
          resourceType: 'compensation_record',
          resourceId: created.id,
          after: { employeeId, amount: dto.amount, currency: dto.currency },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      return created;
    });

    return this.compensationToDto(row);
  }

  async listEmergencyContacts(employeeId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const rows = await this.prisma.emergencyContact.findMany({
      where: { tenantId, employeeId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.emergencyToDto(r));
  }

  async createEmergencyContact(
    employeeId: string,
    dto: CreateEmergencyContactDto,
    tenantId: string,
  ) {
    await this.assertEmployee(employeeId, tenantId);
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (dto.isPrimary) {
        await tx.emergencyContact.updateMany({
          where: { tenantId, employeeId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.emergencyContact.create({
        data: {
          tenantId,
          employeeId,
          name: dto.name,
          relationship: dto.relationship,
          phone: dto.phone,
          email: dto.email ?? null,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });
    return this.emergencyToDto(created);
  }

  async updateEmergencyContact(
    employeeId: string,
    contactId: string,
    dto: UpdateEmergencyContactDto,
    tenantId: string,
  ) {
    await this.assertEmployee(employeeId, tenantId);
    const existing = await this.prisma.emergencyContact.findFirst({
      where: { id: contactId, tenantId, employeeId },
    });
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMERGENCY_CONTACT_NOT_FOUND,
        message: 'Emergency contact not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (dto.isPrimary) {
        await tx.emergencyContact.updateMany({
          where: { tenantId, employeeId, isPrimary: true, NOT: { id: contactId } },
          data: { isPrimary: false },
        });
      }
      return tx.emergencyContact.update({
        where: { id: contactId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.relationship !== undefined ? { relationship: dto.relationship } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        },
      });
    });
    return this.emergencyToDto(updated);
  }

  async deleteEmergencyContact(employeeId: string, contactId: string, tenantId: string) {
    await this.assertEmployee(employeeId, tenantId);
    const existing = await this.prisma.emergencyContact.findFirst({
      where: { id: contactId, tenantId, employeeId },
    });
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMERGENCY_CONTACT_NOT_FOUND,
        message: 'Emergency contact not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    await this.prisma.emergencyContact.delete({ where: { id: contactId } });
  }

  async startImport(
    dto: StartEmployeeImportDto,
    userId: string,
    tenantId: string,
  ) {
    const rows = Array.isArray(dto.rows) ? dto.rows : [];
    if (rows.length === 0) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Import requires at least one row.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const job = await tx.employeeImportJob.create({
        data: {
          tenantId,
          status: 'VALIDATING',
          fileName: dto.fileName ?? null,
          totalRows: rows.length,
          createdBy: userId,
        },
      });

      let validRows = 0;
      let warningRows = 0;
      let errorRows = 0;

      for (let i = 0; i < rows.length; i += 1) {
        const payload = rows[i] ?? {};
        const errors: string[] = [];
        const warnings: string[] = [];

        const firstName = String(payload.firstName ?? '').trim();
        const lastName = String(payload.lastName ?? '').trim();
        const emailWork = String(payload.emailWork ?? '').trim().toLowerCase();
        const legalEntityId = String(payload.legalEntityId ?? '').trim();
        const hireDate = String(payload.hireDate ?? '').trim();
        const employmentType = String(payload.employmentType ?? 'FULL_TIME').trim();

        if (!firstName) errors.push('firstName is required');
        if (!lastName) errors.push('lastName is required');
        if (!emailWork || !emailWork.includes('@')) errors.push('emailWork is invalid');
        if (!legalEntityId) errors.push('legalEntityId is required');
        if (!hireDate) errors.push('hireDate is required');
        if (!payload.departmentId) warnings.push('departmentId is missing');
        if (!payload.managerId) warnings.push('managerId is missing');

        if (emailWork) {
          const existing = await tx.employee.findFirst({
            where: { tenantId, emailWork: { equals: emailWork, mode: 'insensitive' } },
          });
          if (existing) errors.push('emailWork already exists');
        }

        let status = 'VALID';
        if (errors.length > 0) {
          status = 'ERROR';
          errorRows += 1;
        } else if (warnings.length > 0) {
          status = 'WARNING';
          warningRows += 1;
          validRows += 1;
        } else {
          validRows += 1;
        }

        await tx.employeeImportRow.create({
          data: {
            tenantId,
            importJobId: job.id,
            rowNumber: i + 1,
            payload: payload as Prisma.InputJsonValue,
            status,
            errors: errors.length ? errors : undefined,
            warnings: warnings.length ? warnings : undefined,
          },
        });
      }

      const updated = await tx.employeeImportJob.update({
        where: { id: job.id },
        data: {
          status: errorRows > 0 && validRows === 0 ? 'FAILED' : 'VALIDATED',
          validRows,
          warningRows,
          errorRows,
          validatedAt: new Date(),
        },
      });

      return this.importJobToDto(updated);
    });
  }

  async getImport(importId: string, tenantId: string) {
    const job = await this.prisma.employeeImportJob.findFirst({
      where: { id: importId, tenantId },
      include: { rows: { orderBy: { rowNumber: 'asc' }, take: 500 } },
    });
    if (!job) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_IMPORT_NOT_FOUND,
        message: 'Import job not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return {
      ...this.importJobToDto(job),
      rows: job.rows.map((r) => ({
        id: r.id,
        rowNumber: r.rowNumber,
        status: r.status,
        errors: r.errors,
        warnings: r.warnings,
        payload: r.payload,
        employeeId: r.employeeId,
      })),
    };
  }

  async commitImport(
    importId: string,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    const job = await this.prisma.employeeImportJob.findFirst({
      where: { id: importId, tenantId },
    });
    if (!job) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_IMPORT_NOT_FOUND,
        message: 'Import job not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (job.status === 'COMMITTED') {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_IMPORT_ALREADY_COMMITTED,
        message: 'Import already committed.',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (job.status !== 'VALIDATED') {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_IMPORT_NOT_READY,
        message: 'Import must be validated before commit.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx.employeeImportRow.findMany({
        where: {
          tenantId,
          importJobId: importId,
          status: { in: ['VALID', 'WARNING'] },
        },
        orderBy: { rowNumber: 'asc' },
      });

      let committed = 0;
      for (const row of rows) {
        const payload = row.payload as Record<string, unknown>;
        const firstName = String(payload.firstName ?? '').trim();
        const lastName = String(payload.lastName ?? '').trim();
        const emailWork = String(payload.emailWork ?? '').trim().toLowerCase();
        const legalEntityId = String(payload.legalEntityId);
        const hireDate = new Date(String(payload.hireDate));
        const employmentType = String(payload.employmentType ?? 'FULL_TIME');
        const employeeNumber = await this.numberGenerator.next(tenantId, legalEntityId);

        const created = await tx.employee.create({
          data: {
            tenantId,
            legalEntityId,
            branchId: payload.branchId ? String(payload.branchId) : null,
            departmentId: payload.departmentId ? String(payload.departmentId) : null,
            positionId: payload.positionId ? String(payload.positionId) : null,
            managerId: payload.managerId ? String(payload.managerId) : null,
            employeeNumber,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            emailWork,
            hireDate,
            employmentType,
            status: 'ACTIVE',
            createdBy: userId,
            updatedBy: userId,
          },
        });

        await tx.employmentRecord.create({
          data: {
            tenantId,
            employeeId: created.id,
            legalEntityId: created.legalEntityId,
            branchId: created.branchId,
            departmentId: created.departmentId,
            positionId: created.positionId,
            managerId: created.managerId,
            employmentType: created.employmentType,
            changeType: 'INITIAL',
            effectiveFrom: created.hireDate,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        await tx.employeeTimelineEvent.create({
          data: {
            tenantId,
            employeeId: created.id,
            eventType: 'CREATED',
            summary: 'Employee created via bulk import',
            metadata: { importJobId: importId, rowNumber: row.rowNumber },
            occurredAt: new Date(),
            actorId: userId,
            visibility: 'HR',
          },
        });

        await tx.employeeImportRow.update({
          where: { id: row.id },
          data: { status: 'COMMITTED', employeeId: created.id },
        });
        committed += 1;
      }

      const updated = await tx.employeeImportJob.update({
        where: { id: importId },
        data: {
          status: 'COMMITTED',
          committedRows: committed,
          committedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.import_committed',
          resourceType: 'employee_import_job',
          resourceId: importId,
          after: { committedRows: committed },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      return this.importJobToDto(updated);
    });
  }

  async getDataQuality(tenantId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { notIn: ['TERMINATED', 'INACTIVE'] } },
      include: {
        personalDetail: true,
        emergencyContacts: true,
        compensationRecords: { where: { effectiveTo: null }, take: 1 },
      },
    });

    const missingManager: string[] = [];
    const missingDepartment: string[] = [];
    const missingShift: string[] = [];
    const missingBankProxy: string[] = [];
    const missingMandatory: string[] = [];
    const inactiveStructure: string[] = [];

    for (const e of employees) {
      if (!e.managerId) missingManager.push(e.id);
      if (!e.departmentId) missingDepartment.push(e.id);
      if (!e.defaultShiftId) missingShift.push(e.id);
      if (!e.personalDetail?.addressLine1) missingMandatory.push(e.id);
      if (e.emergencyContacts.length === 0) missingMandatory.push(e.id);
      if (e.compensationRecords.length === 0) missingBankProxy.push(e.id);
      if (!e.positionId || !e.branchId) inactiveStructure.push(e.id);
    }

    const duplicateNationalIds = await this.prisma.$queryRaw<
      { national_id: string; count: bigint }[]
    >`
      SELECT national_id, COUNT(*)::bigint AS count
      FROM employee
      WHERE tenant_id = ${tenantId}::uuid
        AND national_id IS NOT NULL
        AND status NOT IN ('TERMINATED', 'INACTIVE')
      GROUP BY national_id
      HAVING COUNT(*) > 1
    `;

    const expiredDocs = await this.prisma.employeeDocument.count({
      where: {
        tenantId,
        expiryDate: { lt: new Date() },
        status: { not: 'REJECTED' },
      },
    });

    return {
      totals: {
        activeEmployees: employees.length,
        missingManager: missingManager.length,
        missingDepartment: missingDepartment.length,
        missingShift: missingShift.length,
        missingMandatoryFields: new Set(missingMandatory).size,
        missingCompensation: missingBankProxy.length,
        inactiveStructureAssignments: inactiveStructure.length,
        duplicateIdentifiers: duplicateNationalIds.length,
        expiredDocuments: expiredDocs,
      },
      samples: {
        missingManager: missingManager.slice(0, 20),
        missingDepartment: missingDepartment.slice(0, 20),
        missingShift: missingShift.slice(0, 20),
        missingMandatoryFields: [...new Set(missingMandatory)].slice(0, 20),
        missingCompensation: missingBankProxy.slice(0, 20),
      },
    };
  }

  private async assertEmployee(employeeId: string, tenantId: string) {
    const employee = await this.repo.findById(employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return employee;
  }

  private async assertNoManagerCycle(
    employeeId: string,
    managerId: string,
    tenantId: string,
  ): Promise<void> {
    if (managerId === employeeId) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_MANAGER_CYCLE,
        message: 'Employee cannot be their own manager.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    let cursor: string | null = managerId;
    const seen = new Set<string>([employeeId]);
    while (cursor) {
      if (seen.has(cursor)) {
        throw new AppException({
          code: ERROR_CODES.EMPLOYEE_MANAGER_CYCLE,
          message: 'Manager hierarchy cycle detected.',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      seen.add(cursor);
      const mgr = await this.repo.findById(cursor, tenantId);
      cursor = mgr?.managerId ?? null;
    }
  }

  private employmentToDto(row: {
    id: string;
    employeeId: string;
    legalEntityId: string;
    branchId: string | null;
    departmentId: string | null;
    positionId: string | null;
    managerId: string | null;
    costCentreId: string | null;
    gradeId: string | null;
    employmentType: string;
    workArrangement: string | null;
    probationEndDate: Date | null;
    changeReason: string | null;
    changeType: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      legalEntityId: row.legalEntityId,
      branchId: row.branchId,
      departmentId: row.departmentId,
      positionId: row.positionId,
      managerId: row.managerId,
      costCentreId: row.costCentreId,
      gradeId: row.gradeId,
      employmentType: row.employmentType,
      workArrangement: row.workArrangement,
      probationEndDate: row.probationEndDate?.toISOString().split('T')[0] ?? null,
      changeReason: row.changeReason,
      changeType: row.changeType,
      effectiveFrom: row.effectiveFrom.toISOString().split('T')[0] ?? '',
      effectiveTo: row.effectiveTo?.toISOString().split('T')[0] ?? null,
    };
  }

  private compensationToDto(row: {
    id: string;
    employeeId: string;
    amount: Prisma.Decimal;
    currency: string;
    payFrequency: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    notes: string | null;
  }) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      amount: row.amount.toString(),
      currency: row.currency,
      payFrequency: row.payFrequency,
      effectiveFrom: row.effectiveFrom.toISOString().split('T')[0] ?? '',
      effectiveTo: row.effectiveTo?.toISOString().split('T')[0] ?? null,
      notes: row.notes,
    };
  }

  private emergencyToDto(row: {
    id: string;
    employeeId: string;
    name: string;
    relationship: string;
    phone: string;
    email: string | null;
    isPrimary: boolean;
  }) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      name: row.name,
      relationship: row.relationship,
      phone: row.phone,
      email: row.email,
      isPrimary: row.isPrimary,
    };
  }

  private importJobToDto(job: {
    id: string;
    status: string;
    fileName: string | null;
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    committedRows: number;
    createdAt: Date;
    validatedAt: Date | null;
    committedAt: Date | null;
  }) {
    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      totalRows: job.totalRows,
      validRows: job.validRows,
      warningRows: job.warningRows,
      errorRows: job.errorRows,
      committedRows: job.committedRows,
      createdAt: job.createdAt.toISOString(),
      validatedAt: job.validatedAt?.toISOString() ?? null,
      committedAt: job.committedAt?.toISOString() ?? null,
    };
  }
}
