import { Injectable } from '@nestjs/common';
import {
  type OnboardingInstance,
  type OnboardingInstanceTask,
  type Prisma,
} from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListOnboardingInstancesDto } from '../dto/list-documents.dto';

export type OnboardingInstanceWithTasks = OnboardingInstance & {
  tasks: OnboardingInstanceTask[];
};

@Injectable()
export class OnboardingInstanceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<OnboardingInstanceWithTasks | null> {
    return this.prisma.onboardingInstance.findFirst({
      where: { id, tenantId },
      include: { tasks: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async findTaskById(
    taskId: string,
    instanceId: string,
    tenantId: string,
  ): Promise<OnboardingInstanceTask | null> {
    return this.prisma.onboardingInstanceTask.findFirst({
      where: { id: taskId, onboardingInstanceId: instanceId, tenantId },
    });
  }

  async findMany(
    query: ListOnboardingInstancesDto,
    tenantId: string,
  ): Promise<{ data: OnboardingInstance[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.OnboardingInstanceWhereInput = {
      tenantId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy: Prisma.OnboardingInstanceOrderByWithRelationInput =
      query.sortBy === 'title'
        ? { title: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.onboardingInstance.findMany({ where, skip, take, orderBy }),
      this.prisma.onboardingInstance.count({ where }),
    ]);

    return { data, total };
  }

  async create(
    data: Prisma.OnboardingInstanceCreateInput,
  ): Promise<OnboardingInstance> {
    return this.prisma.onboardingInstance.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.OnboardingInstanceUpdateInput,
    expectedVersion?: bigint,
  ): Promise<OnboardingInstance> {
    return this.prisma.onboardingInstance.update({
      where: {
        id,
        tenantId,
        ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
      },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async createTask(
    data: Prisma.OnboardingInstanceTaskCreateInput,
  ): Promise<OnboardingInstanceTask> {
    return this.prisma.onboardingInstanceTask.create({ data });
  }

  async updateTask(
    taskId: string,
    tenantId: string,
    data: Prisma.OnboardingInstanceTaskUpdateInput,
  ): Promise<OnboardingInstanceTask> {
    return this.prisma.onboardingInstanceTask.update({
      where: { id: taskId, tenantId },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
