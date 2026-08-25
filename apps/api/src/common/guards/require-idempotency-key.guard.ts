import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constants';

/**
 * Endpoint-level policy: mutating roster operations require Idempotency-Key.
 * Format validation remains in IdempotencyHeaderMiddleware.
 */
@Injectable()
export class RequireIdempotencyKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const value = request.headers['idempotency-key'];
    const key = Array.isArray(value) ? value[0] : value;
    if (!key || !String(key).trim()) {
      throw new BadRequestException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Idempotency-Key header is required.',
      });
    }
    return true;
  }
}
