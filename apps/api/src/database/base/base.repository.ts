import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Abstract base for all domain repositories.
 *
 * Subclasses inject PrismaService via NestJS DI and call super(prisma).
 * All tenant-scoped operations MUST use withTenantTransaction.
 * Cross-module data access is done via module services, not direct DB joins.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected async withTenantTransaction<T>(
    tenantId: string,
    fn: (tx: PrismaTx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.withTenantTransaction(tenantId, fn);
  }

  protected async withTransaction<T>(
    fn: (tx: PrismaTx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.withTransaction(fn);
  }
}
