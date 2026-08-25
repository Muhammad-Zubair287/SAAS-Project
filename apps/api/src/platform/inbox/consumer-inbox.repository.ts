import { Injectable } from '@nestjs/common';
import { ConsumerInboxStatus, type ConsumerInbox } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ConsumerInboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claim(
    eventId: string,
    consumerName: string,
    tenantId?: string | null,
  ): Promise<ConsumerInbox> {
    const existing = await this.prisma.consumerInbox.findUnique({
      where: { eventId_consumerName: { eventId, consumerName } },
    });
    if (existing) return existing;
    try {
      return await this.prisma.consumerInbox.create({
        data: { eventId, consumerName, tenantId: tenantId ?? null },
      });
    } catch {
      return this.prisma.consumerInbox.findUniqueOrThrow({
        where: { eventId_consumerName: { eventId, consumerName } },
      });
    }
  }

  complete(id: string): Promise<ConsumerInbox> {
    return this.prisma.consumerInbox.update({
      where: { id },
      data: {
        status: ConsumerInboxStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  fail(id: string, error: Error, deadLetter: boolean): Promise<ConsumerInbox> {
    return this.prisma.consumerInbox.update({
      where: { id },
      data: {
        status: deadLetter ? ConsumerInboxStatus.DEAD_LETTERED : ConsumerInboxStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error.message.slice(0, 4000),
      },
    });
  }
}
