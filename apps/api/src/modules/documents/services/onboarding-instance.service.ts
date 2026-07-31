import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type OnboardingInstance,
  type OnboardingInstanceTask,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import {
  OnboardingInstanceRepository,
  type OnboardingInstanceWithTasks,
} from '../repositories/onboarding-instance.repository';
import { OnboardingTemplateRepository } from '../repositories/onboarding-template.repository';
import type {
  CreateOnboardingInstanceDto,
  UpdateOnboardingInstanceTaskDto,
  OnboardingInstanceResponseDto,
  OnboardingInstanceTaskResponseDto,
} from '../dto/onboarding-instance.dto';
import type { ListOnboardingInstancesDto } from '../dto/list-documents.dto';

@Injectable()
export class OnboardingInstanceService {
  constructor(
    private readonly repo: OnboardingInstanceRepository,
    private readonly templateRepo: OnboardingTemplateRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateOnboardingInstanceDto,
    userId: string,
    tenantId: string,
  ): Promise<OnboardingInstanceResponseDto> {
    const instance = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.onboardingInstance.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          onboardingTemplateId: dto.onboardingTemplateId ?? null,
          title: dto.title,
          status: 'PENDING',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // If a template is provided, hydrate tasks from template
      if (dto.onboardingTemplateId) {
        const template = await tx.onboardingTemplate.findFirst({
          where: { id: dto.onboardingTemplateId, tenantId },
          include: { tasks: { orderBy: { sortOrder: 'asc' } } },
        });
        if (template) {
          for (const templateTask of template.tasks) {
            const dueDate =
              dto.dueDate && templateTask.dueDays
                ? new Date(
                    new Date(dto.dueDate).getTime() -
                      templateTask.dueDays * 24 * 60 * 60 * 1000,
                  )
                : null;
            await tx.onboardingInstanceTask.create({
              data: {
                tenantId,
                onboardingInstanceId: created.id,
                templateTaskId: templateTask.id,
                title: templateTask.title,
                taskType: templateTask.taskType,
                isRequired: templateTask.isRequired,
                status: 'PENDING',
                dueDate,
              },
            });
          }
        }
      }

      return created;
    });

    return this.toDto(instance);
  }

  async findMany(
    query: ListOnboardingInstancesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<OnboardingInstanceResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<OnboardingInstanceResponseDto> {
    const record = await this.repo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_INSTANCE_NOT_FOUND,
        message: 'Onboarding instance not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDtoWithTasks(record);
  }

  async updateTask(
    instanceId: string,
    taskId: string,
    dto: UpdateOnboardingInstanceTaskDto,
    userId: string,
    tenantId: string,
  ): Promise<OnboardingInstanceTaskResponseDto> {
    const instance = await this.repo.findById(instanceId, tenantId);
    if (!instance) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_INSTANCE_NOT_FOUND,
        message: 'Onboarding instance not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const task = await this.repo.findTaskById(taskId, instanceId, tenantId);
    if (!task) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_INSTANCE_TASK_NOT_FOUND,
        message: 'Onboarding instance task not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const completedAt =
      dto.status === 'COMPLETED' ? new Date() : task.completedAt;
    const completedBy =
      dto.status === 'COMPLETED' ? userId : task.completedBy;

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const updatedTask = await tx.onboardingInstanceTask.update({
        where: { id: taskId, tenantId },
        data: {
          status: dto.status,
          notes: dto.notes ?? task.notes,
          completedAt,
          completedBy,
          rowVersion: { increment: 1 },
        },
      });

      // Check if all required tasks are complete; if so, complete instance
      const allTasks = await tx.onboardingInstanceTask.findMany({
        where: { onboardingInstanceId: instanceId, tenantId },
      });
      const allRequiredDone = allTasks
        .filter((t) => t.isRequired)
        .every((t) =>
          t.id === taskId
            ? dto.status === 'COMPLETED' || dto.status === 'SKIPPED'
            : t.status === 'COMPLETED' || t.status === 'SKIPPED',
        );

      if (allRequiredDone && instance.status !== 'COMPLETED') {
        await tx.onboardingInstance.update({
          where: { id: instanceId, tenantId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            updatedBy: userId,
            rowVersion: { increment: 1 },
          },
        });
      } else if (
        instance.status === 'PENDING' &&
        dto.status === 'IN_PROGRESS'
      ) {
        await tx.onboardingInstance.update({
          where: { id: instanceId, tenantId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            updatedBy: userId,
            rowVersion: { increment: 1 },
          },
        });
      }

      return updatedTask;
    });

    return this.toTaskDto(updated);
  }

  private toDto(r: OnboardingInstance): OnboardingInstanceResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      onboardingTemplateId: r.onboardingTemplateId,
      title: r.title,
      status: r.status,
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      dueDate: r.dueDate ? r.dueDate.toISOString().split('T')[0] ?? null : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      rowVersion: r.rowVersion.toString(),
    };
  }

  private toDtoWithTasks(r: OnboardingInstanceWithTasks): OnboardingInstanceResponseDto {
    return {
      ...this.toDto(r),
      tasks: r.tasks.map((t) => this.toTaskDto(t)),
    };
  }

  private toTaskDto(t: OnboardingInstanceTask): OnboardingInstanceTaskResponseDto {
    return {
      id: t.id,
      tenantId: t.tenantId,
      onboardingInstanceId: t.onboardingInstanceId,
      templateTaskId: t.templateTaskId,
      title: t.title,
      taskType: t.taskType,
      isRequired: t.isRequired,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] ?? null : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      completedBy: t.completedBy,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      rowVersion: t.rowVersion.toString(),
    };
  }
}
