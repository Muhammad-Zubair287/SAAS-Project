import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Adds a strong representation ETag to successful JSON responses. */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      tap((body: unknown) => {
        if (response.headersSent || body === undefined) return;
        const digest = createHash('sha256')
          .update(
            JSON.stringify(body, (_key, value) =>
              typeof value === 'bigint' ? value.toString() : value,
            ),
          )
          .digest('base64url');
        response.setHeader('ETag', `"${digest}"`);
      }),
    );
  }
}
