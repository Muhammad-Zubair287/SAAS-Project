import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { CreateGradeDto, ListGradesDto, UpdateGradeDto } from '../controllers/grade-and-overview.controller';

@Injectable()
export class GradeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGradeDto, userId: string, tenantId: string) {
    const existing = await this.prisma.grade.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.GRADE_CODE_CONFLICT,
        message: `Grade code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }
    const created = await this.prisma.grade.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    return this.toDto(created);
  }

  async findMany(query: ListGradesDto, tenantId: string) {
    const { skip, take } = toPrismaSkipTake(query);
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { code: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.grade.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.grade.count({ where }),
    ]);
    return createPaginatedResponse(
      data.map((g) => this.toDto(g)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string) {
    const grade = await this.prisma.grade.findFirst({ where: { id, tenantId } });
    if (!grade) {
      throw new AppException({
        code: ERROR_CODES.GRADE_NOT_FOUND,
        message: 'Grade not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(grade);
  }

  async update(id: string, dto: UpdateGradeDto, userId: string, tenantId: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
    return this.toDto(updated);
  }

  async deactivate(id: string, userId: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.grade.update({
      where: { id },
      data: { status: 'INACTIVE', updatedBy: userId, rowVersion: { increment: 1 } },
    });
  }

  private toDto(g: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    rowVersion: bigint;
  }) {
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      description: g.description,
      sortOrder: g.sortOrder,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      rowVersion: g.rowVersion.toString(),
    };
  }
}
