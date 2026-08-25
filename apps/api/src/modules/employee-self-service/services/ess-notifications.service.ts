import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';

@Injectable()
export class EssNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    userId: string,
    query: { page?: number; pageSize?: number; status?: 'READ' | 'UNREAD' },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserNotificationWhereInput = {
      tenantId,
      userId,
      ...(query.status === 'READ' ? { readAt: { not: null } } : {}),
      ...(query.status === 'UNREAD' ? { readAt: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.userNotification.count({ where }),
    ]);
    return createPaginatedResponse(data.map((notification) => this.toDto(notification)), total, page, pageSize);
  }

  async unreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.userNotification.count({
      where: { tenantId, userId, readAt: null },
    });
    return { count };
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const existing = await this.prisma.userNotification.findFirst({
      where: { id, tenantId, userId },
    });
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Notification not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const updated = await this.prisma.userNotification.update({
      where: { id: existing.id, tenantId },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return this.toDto(updated);
  }

  async markAllRead(tenantId: string, userId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private toDto(notification: {
    id: string;
    title: string;
    body: string | null;
    category: string | null;
    linkPath: string | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      category: notification.category,
      linkPath: notification.linkPath,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
