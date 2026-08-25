import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { PublishPayslipDto } from '../dto/publish-payslip.dto';
import { EssContextService } from './ess-context.service';

@Injectable()
export class EssPayslipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async listPayslips(tenantId: string, userId: string, page = 1, pageSize = 20) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const where = { tenantId, employeeId: employee.id, status: 'PUBLISHED' as const };
    const [data, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { periodEnd: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return createPaginatedResponse(data.map((payslip) => this.toDto(payslip)), total, page, pageSize);
  }

  async getPayslip(tenantId: string, userId: string, id: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const payslip = await this.prisma.payslip.findFirst({
      where: { id, tenantId, employeeId: employee.id, status: 'PUBLISHED' },
    });
    if (!payslip) this.notFound();
    return this.toDto(payslip);
  }

  async latestPublishedForEmployee(tenantId: string, employeeId: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { tenantId, employeeId, status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { periodEnd: 'desc' }],
    });
    return payslip ? this.toDto(payslip) : null;
  }

  async publishPayslip(tenantId: string, dto: PublishPayslipDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found for this tenant.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const periodStart = this.parseDate(dto.periodStart);
    const periodEnd = this.parseDate(dto.periodEnd);
    if (periodEnd < periodStart) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Payslip period end must be on or after period start.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const payslip = await this.prisma.payslip.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        payrollVersionId: dto.payrollVersionId ?? null,
        periodLabel: dto.periodLabel,
        periodStart,
        periodEnd,
        currency: dto.currency.toUpperCase(),
        grossAmount: new Prisma.Decimal(dto.grossAmount),
        netAmount: new Prisma.Decimal(dto.netAmount),
        earnings: dto.earnings as Prisma.InputJsonValue,
        deductions: dto.deductions as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        documentFileKey: dto.documentFileKey ?? null,
      },
    });
    return {
      ...this.toDto(payslip),
      message: 'Payslip published.',
    };
  }

  private parseDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toDto(payslip: Prisma.PayslipGetPayload<object>) {
    return {
      id: payslip.id,
      periodLabel: payslip.periodLabel,
      periodStart: this.toDateOnly(payslip.periodStart),
      periodEnd: this.toDateOnly(payslip.periodEnd),
      currency: payslip.currency,
      grossAmount: Number(payslip.grossAmount),
      netAmount: Number(payslip.netAmount),
      earnings: payslip.earnings,
      deductions: payslip.deductions,
      status: payslip.status,
      publishedAt: payslip.publishedAt?.toISOString() ?? null,
      documentFileKey: payslip.documentFileKey,
      createdAt: payslip.createdAt.toISOString(),
      updatedAt: payslip.updatedAt.toISOString(),
      rowVersion: payslip.rowVersion.toString(),
    };
  }

  private notFound(): never {
    throw new AppException({
      code: ERROR_CODES.NOT_FOUND,
      message: 'Payslip not found.',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
