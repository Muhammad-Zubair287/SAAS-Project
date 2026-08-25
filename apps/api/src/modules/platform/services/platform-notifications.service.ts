import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

@Injectable()
export class PlatformNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, opts: { unreadOnly?: boolean; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where = {
      userId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.platformNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.platformNotification.count({ where }),
    ]);

    return createPaginatedResponse(
      data.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? undefined,
        category: n.category ?? undefined,
        linkPath: n.linkPath ?? undefined,
        severity: n.severity,
        readAt: n.readAt?.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.platformNotification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.platformNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.platformNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async createForUser(
    userId: string,
    data: {
      title: string;
      body?: string;
      category?: string;
      linkPath?: string;
      severity?: string;
    },
  ) {
    return this.prisma.platformNotification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        category: data.category,
        linkPath: data.linkPath,
        severity: data.severity ?? 'INFO',
      },
    });
  }

  async broadcastAnnouncement(
    actor: PlatformActorContext,
    data: { title: string; body?: string; linkPath?: string },
  ) {
    const users = await this.prisma.appUser.findMany({
      where: {
        isActive: true,
        platformRole: { not: null },
      },
      select: { id: true },
    });

    if (users.length === 0) return { created: 0 };

    await this.prisma.platformNotification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: data.title,
        body: data.body,
        category: 'announcement',
        linkPath: data.linkPath,
        severity: 'INFO',
      })),
    });

    return { created: users.length, actorId: actor.actorId };
  }
}
