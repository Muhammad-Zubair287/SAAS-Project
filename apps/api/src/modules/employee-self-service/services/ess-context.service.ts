import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';

export const selfEmployeeInclude = Prisma.validator<Prisma.EmployeeInclude>()({
  personalDetail: true,
  department: { select: { id: true, name: true, code: true } },
  position: { select: { id: true, title: true, code: true } },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      timezone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateProvince: true,
      postalCode: true,
      countryCode: true,
    },
  },
  manager: { select: { id: true, displayName: true } },
  legalEntity: { select: { id: true, name: true, countryCode: true, timezone: true } },
  defaultShift: {
    select: {
      id: true,
      name: true,
      code: true,
      startLocalTime: true,
      endLocalTime: true,
      crossesMidnight: true,
      requiredMinutes: true,
    },
  },
  emergencyContacts: {
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  },
});

export type SelfEmployee = Prisma.EmployeeGetPayload<{
  include: typeof selfEmployeeInclude;
}>;

@Injectable()
export class EssContextService {
  constructor(private readonly prisma: PrismaService) {}

  assertTenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return user.tenantId;
  }

  async requireSelfEmployee(tenantId: string, userId: string): Promise<SelfEmployee> {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId },
      include: selfEmployeeInclude,
    });

    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'No employee profile is linked to the current user.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return employee;
  }
}
