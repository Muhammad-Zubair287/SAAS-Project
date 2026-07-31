import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONSTANTS } from '../constants/app.constants';
import type { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCorrelation>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers[APP_CONSTANTS.CORRELATION_ID_HEADER] as
        | string
        | undefined) ?? uuidv4();

    request.correlationId = correlationId;
    request.startTime = Date.now();

    response.setHeader(APP_CONSTANTS.CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
