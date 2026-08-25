import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('DB');

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.debug('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('PostgreSQL connected');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('Disconnecting from PostgreSQL...');
    await this.$disconnect();
  }

  /**
   * Executes fn within a transaction with tenant context.
   * Mandatory pattern for ALL tenant-scoped database operations (ADR-002).
   *
   * SET LOCAL app.tenant_id is picked up by PostgreSQL RLS policies on every
   * tenant-owned table: USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
   */
  async withTenantTransaction<T>(
    tenantId: string,
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Prisma parameterizes tagged `$executeRaw` as `$1`, which breaks `SET LOCAL … = $1`.
      // `set_config(..., true)` is transaction-local and accepts bound parameters safely.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  /**
   * Executes fn within a platform-level transaction (no tenant scope).
   * Use only for platform/infrastructure operations not scoped to a tenant.
   */
  async withTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => fn(tx));
  }
}
