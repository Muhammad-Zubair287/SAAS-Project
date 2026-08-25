import { BadRequestException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constants';

/**
 * Performs transport-level validation only. Endpoint-level policy determines
 * whether an idempotency key is mandatory; persistent replay handling remains
 * with the approved idempotency infrastructure.
 */
@Injectable()
export class IdempotencyHeaderMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const value = request.headers['idempotency-key'];
    const key = Array.isArray(value) ? value[0] : value;
    if (key !== undefined && (!key.trim() || key.length > 255 || /[\r\n]/.test(key))) {
      throw new BadRequestException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Idempotency-Key must be a non-empty header of at most 255 characters.',
      });
    }

    const ifMatch = request.headers['if-match'];
    const etag = Array.isArray(ifMatch) ? ifMatch[0] : ifMatch;
    // Strong ETag (`"1"`), bare numeric rowVersion (`1`), or wildcard.
    if (etag !== undefined && !/^(?:\*|"[A-Za-z0-9_-]+"|[0-9]+)$/.test(etag)) {
      throw new BadRequestException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'If-Match must contain a strong ETag, bare numeric rowVersion, or wildcard value.',
      });
    }
    next();
  }
}
