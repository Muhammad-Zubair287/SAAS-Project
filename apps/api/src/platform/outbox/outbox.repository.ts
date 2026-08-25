import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, type OutboxEvent } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDispatchable(limit: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: { status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  markPublished(id: string): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxEventStatus.PUBLISHED,
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  recordFailure(id: string, error: Error, deadLetter: boolean): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: deadLetter ? OutboxEventStatus.DEAD_LETTERED : OutboxEventStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error.message.slice(0, 4000),
      },
    });
  }
}
