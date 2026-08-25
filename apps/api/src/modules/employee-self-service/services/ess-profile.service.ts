import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PatchEssProfileDto } from '../dto/patch-ess-profile.dto';
import { EssContextService, type SelfEmployee } from './ess-context.service';

const FIELD_ACCESS = {
  phoneMobile: 'direct',
  emailPersonal: 'direct',
  preferredName: 'direct',
  addressLine1: 'direct',
  addressLine2: 'direct',
  city: 'direct',
  stateProvince: 'direct',
  postalCode: 'direct',
  countryCode: 'direct',
  firstName: 'request',
  lastName: 'request',
  displayName: 'request',
  nationalId: 'request',
  bank: 'request',
  employmentType: 'request',
  legalEntity: 'request',
  branch: 'request',
  department: 'request',
  position: 'request',
  manager: 'request',
  employeeNumber: 'readonly',
  emailWork: 'readonly',
  hireDate: 'readonly',
  status: 'readonly',
} as const;

@Injectable()
export class EssProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async getProfile(tenantId: string, userId: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    return this.toProfileDto(employee);
  }

  async patchProfile(tenantId: string, userId: string, dto: PatchEssProfileDto) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);

    const employeeData: Prisma.EmployeeUpdateInput = {};
    if (dto.phoneMobile !== undefined) employeeData.phoneMobile = dto.phoneMobile;
    if (dto.emailPersonal !== undefined) employeeData.emailPersonal = dto.emailPersonal;
    if (dto.preferredName !== undefined) employeeData.preferredName = dto.preferredName;
    if (Object.keys(employeeData).length > 0) {
      employeeData.updatedBy = userId;
      employeeData.rowVersion = { increment: 1 };
    }

    const personalData: Prisma.EmployeePersonalDetailUpdateInput = {};
    if (dto.addressLine1 !== undefined) personalData.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) personalData.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) personalData.city = dto.city;
    if (dto.stateProvince !== undefined) personalData.stateProvince = dto.stateProvince;
    if (dto.postalCode !== undefined) personalData.postalCode = dto.postalCode;
    if (dto.countryCode !== undefined) personalData.countryCode = dto.countryCode;
    if (Object.keys(personalData).length > 0) {
      personalData.rowVersion = { increment: 1 };
    }

    if (Object.keys(employeeData).length > 0 || Object.keys(personalData).length > 0) {
      await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        if (Object.keys(employeeData).length > 0) {
          await tx.employee.update({
            where: { id: employee.id, tenantId },
            data: employeeData,
          });
        }
        if (Object.keys(personalData).length > 0) {
          await tx.employeePersonalDetail.upsert({
            where: { employeeId: employee.id },
            create: {
              tenantId,
              employeeId: employee.id,
              addressLine1: dto.addressLine1 ?? null,
              addressLine2: dto.addressLine2 ?? null,
              city: dto.city ?? null,
              stateProvince: dto.stateProvince ?? null,
              postalCode: dto.postalCode ?? null,
              countryCode: dto.countryCode ?? null,
            },
            update: personalData,
          });
        }
      });
    }

    return this.getProfile(tenantId, userId);
  }

  private toProfileDto(employee: SelfEmployee) {
    return {
      id: employee.id,
      fieldAccess: FIELD_ACCESS,
      personal: {
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        displayName: employee.displayName,
        preferredName: employee.preferredName,
        gender: employee.gender,
        dateOfBirth: this.dateOnly(employee.dateOfBirth),
      },
      contact: {
        emailWork: employee.emailWork,
        emailPersonal: employee.emailPersonal,
        phoneWork: employee.phoneWork,
        phoneMobile: employee.phoneMobile,
        address: {
          addressLine1: employee.personalDetail?.addressLine1 ?? null,
          addressLine2: employee.personalDetail?.addressLine2 ?? null,
          city: employee.personalDetail?.city ?? null,
          stateProvince: employee.personalDetail?.stateProvince ?? null,
          postalCode: employee.personalDetail?.postalCode ?? null,
          countryCode: employee.personalDetail?.countryCode ?? null,
        },
      },
      employment: {
        hireDate: this.dateOnly(employee.hireDate),
        terminationDate: this.dateOnly(employee.terminationDate),
        status: employee.status,
        employmentType: employee.employmentType,
      },
      manager: employee.manager
        ? { id: employee.manager.id, displayName: employee.manager.displayName }
        : null,
      location: {
        legalEntity: employee.legalEntity,
        branch: employee.branch,
        department: employee.department,
        position: employee.position,
      },
      emergencyContacts: employee.emergencyContacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        email: contact.email,
        isPrimary: contact.isPrimary,
      })),
      rowVersion: employee.rowVersion.toString(),
    };
  }

  private dateOnly(value: Date | null): string | null {
    return value ? value.toISOString().split('T')[0] ?? null : null;
  }
}
