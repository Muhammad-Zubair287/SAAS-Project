import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class EmployeeNumberGenerator {
  constructor(private readonly prisma: PrismaService) {}

  async next(tenantId: string, legalEntityId: string): Promise<string> {
    const result = await this.prisma.$queryRaw<{ max_num: string | null }[]>`
      SELECT MAX(
        CASE WHEN employee_number ~ '^EMP-[0-9]+$'
          THEN CAST(SUBSTRING(employee_number FROM 5) AS INTEGER)
          ELSE 0
        END
      )::TEXT AS max_num
      FROM employee
      WHERE tenant_id    = ${tenantId}::uuid
        AND legal_entity_id = ${legalEntityId}::uuid
    `;
    const maxNum = parseInt(result[0]?.max_num ?? '0', 10);
    return `EMP-${String(maxNum + 1).padStart(5, '0')}`;
  }
}
