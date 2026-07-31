import { HttpStatus, Injectable } from '@nestjs/common';
import { type EmployeePersonalDetail } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { EmployeeRepository } from '../repositories/employee.repository';
import { PersonalDetailRepository } from '../repositories/personal-detail.repository';
import type { UpsertPersonalDetailDto } from '../dto/upsert-personal-detail.dto';
import type { PersonalDetailResponseDto } from '../dto/personal-detail-response.dto';

type PersonalDetailRow = {
  id: string;
  tenantId: string;
  employeeId: string;
  nationality: string | null;
  countryOfBirth: string | null;
  maritalStatus: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class PersonalDetailService {
  constructor(
    private readonly repo: PersonalDetailRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly prisma: PrismaService,
  ) {}

  async upsert(
    employeeId: string,
    dto: UpsertPersonalDetailDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<PersonalDetailResponseDto> {
    const employee = await this.employeeRepo.findById(employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const result = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const record = await tx.employeePersonalDetail.upsert({
        where: { employeeId },
        create: {
          tenantId,
          employeeId,
          nationality: dto.nationality ?? null,
          countryOfBirth: dto.countryOfBirth ?? null,
          maritalStatus: dto.maritalStatus ?? null,
          addressLine1: dto.addressLine1 ?? null,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city ?? null,
          stateProvince: dto.stateProvince ?? null,
          postalCode: dto.postalCode ?? null,
          countryCode: dto.countryCode ?? null,
          nextOfKinName: dto.nextOfKinName ?? null,
          nextOfKinRelationship: dto.nextOfKinRelationship ?? null,
          nextOfKinPhone: dto.nextOfKinPhone ?? null,
        },
        update: {
          nationality: dto.nationality ?? null,
          countryOfBirth: dto.countryOfBirth ?? null,
          maritalStatus: dto.maritalStatus ?? null,
          addressLine1: dto.addressLine1 ?? null,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city ?? null,
          stateProvince: dto.stateProvince ?? null,
          postalCode: dto.postalCode ?? null,
          countryCode: dto.countryCode ?? null,
          nextOfKinName: dto.nextOfKinName ?? null,
          nextOfKinRelationship: dto.nextOfKinRelationship ?? null,
          nextOfKinPhone: dto.nextOfKinPhone ?? null,
          rowVersion: { increment: 1 },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee_personal_detail.updated',
          resourceType: 'employee_personal_detail',
          resourceId: record.id,
          after: { employeeId, maritalStatus: record.maritalStatus },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      return record;
    });

    return this.toDto(result);
  }

  async findByEmployeeId(
    employeeId: string,
    tenantId: string,
  ): Promise<PersonalDetailResponseDto> {
    const employee = await this.employeeRepo.findById(employeeId, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const detail = await this.repo.findByEmployeeId(employeeId, tenantId);
    if (!detail) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_PERSONAL_DETAIL_NOT_FOUND,
        message: 'Personal detail record not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(detail);
  }

  private toDto(d: EmployeePersonalDetail | PersonalDetailRow): PersonalDetailResponseDto {
    return {
      id: d.id,
      tenantId: d.tenantId,
      employeeId: d.employeeId,
      nationality: d.nationality,
      countryOfBirth: d.countryOfBirth,
      maritalStatus: d.maritalStatus,
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2,
      city: d.city,
      stateProvince: d.stateProvince,
      postalCode: d.postalCode,
      countryCode: d.countryCode,
      nextOfKinName: d.nextOfKinName,
      nextOfKinRelationship: d.nextOfKinRelationship,
      nextOfKinPhone: d.nextOfKinPhone,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      rowVersion: d.rowVersion.toString(),
    };
  }
}
