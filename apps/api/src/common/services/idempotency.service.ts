import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AppException } from '../exceptions/app.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';
import { PrismaService } from '../../database/prisma/prisma.service';

const DEFAULT_TTL_HOURS = 24;

export interface IdempotencyReplay<T> {
  replay: true;
  body: T;
  statusCode: number;
}

export interface IdempotencyProceed {
  replay: false;
}

export type IdempotencyResult<T> = IdempotencyReplay<T> | IdempotencyProceed;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashRequest(payload: unknown): string {
    const normalized = JSON.stringify(payload, Object.keys(payload as object).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  async begin<T>(
    key: string,
    requestHash: string,
    tenantId?: string | null,
  ): Promise<IdempotencyResult<T>> {
    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppException({
          code: ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
          message: 'Idempotency key was already used with a different request payload.',
          statusCode: HttpStatus.CONFLICT,
        });
      }
      if (existing.responseBody != null && existing.statusCode != null) {
        return {
          replay: true,
          body: existing.responseBody as T,
          statusCode: existing.statusCode,
        };
      }
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: 'A request with this idempotency key is already in progress.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);
    await this.prisma.idempotencyKey.create({
      data: {
        key,
        requestHash,
        tenantId: tenantId ?? null,
        expiresAt,
      },
    });

    return { replay: false };
  }

  async complete<T>(
    key: string,
    statusCode: number,
    responseBody: T,
    tenantId?: string | null,
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        statusCode,
        responseBody: responseBody as object,
        ...(tenantId ? { tenantId } : {}),
      },
    });
  }

  async fail(key: string): Promise<void> {
    await this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
  }
}
