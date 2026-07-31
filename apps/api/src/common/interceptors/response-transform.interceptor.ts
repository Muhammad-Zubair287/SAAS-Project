import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { METADATA_KEYS } from '../constants/app.constants';
import type { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.SKIP_RESPONSE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithCorrelation>();

    return next.handle().pipe(
      map((data: unknown) => {
        // Pass through if already wrapped (e.g. paginated responses built by helpers)
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in (data as Record<string, unknown>)
        ) {
          return data;
        }

        return {
          success: true,
          data,
          correlationId: request.correlationId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
