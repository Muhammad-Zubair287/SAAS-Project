import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithCorrelation>();
    return request.correlationId;
  },
);
