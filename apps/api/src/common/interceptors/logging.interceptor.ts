import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCorrelation>();
    const { method, url } = request;
    const correlationId = request.correlationId;
    const startTime = request.startTime ?? Date.now();

    this.logger.debug({ correlationId, method, url }, 'Incoming request');

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          this.logger.debug(
            {
              correlationId,
              method,
              url,
              statusCode: response.statusCode,
              durationMs: duration,
            },
            'Request completed',
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            { correlationId, method, url, durationMs: duration },
            `Request failed: ${error.message}`,
          );
        },
      }),
    );
  }
}
