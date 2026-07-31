import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentApiClientContext } from '../interfaces/current-api-client-context.interface';

export const CurrentApiClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentApiClientContext => {
    const request = ctx.switchToHttp().getRequest<Request & { apiClient: CurrentApiClientContext }>();
    return request.apiClient;
  },
);
