import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { ListPayrollPayslipsQueryDto } from '../dto/list-payslips.dto';

@Injectable()
export class PayrollAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayslips(tenantId: string, query: ListPayrollPayslipsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PayslipWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        include: {
          employee: { select: { id: true, displayName: true, employeeNumber: true } },
        },
        orderBy: [{ publishedAt: 'desc' }, { periodEnd: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return createPaginatedResponse(
      rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    );
  }

  async summary(tenantId: string) {
    const [publishedCount, generatedCount] = await Promise.all([
      this.prisma.payslip.count({ where: { tenantId, status: 'PUBLISHED' } }),
      this.prisma.payslip.count({ where: { tenantId, status: 'GENERATED' } }),
    ]);
    return { publishedCount, generatedCount, totalCount: publishedCount + generatedCount };
  }

  private toDto(
    row: Prisma.PayslipGetPayload<{
      include: { employee: { select: { id: true; displayName: true; employeeNumber: true } } };
    }>,
  ) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employee: {
        id: row.employee.id,
        displayName: row.employee.displayName,
        employeeNumber: row.employee.employeeNumber,
      },
      periodLabel: row.periodLabel,
      periodStart: row.periodStart.toISOString().slice(0, 10),
      periodEnd: row.periodEnd.toISOString().slice(0, 10),
      currency: row.currency,
      grossAmount: Number(row.grossAmount),
      netAmount: Number(row.netAmount),
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      rowVersion: row.rowVersion.toString(),
    };
  }
}
