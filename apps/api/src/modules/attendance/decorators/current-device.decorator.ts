import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentDeviceContext } from '../interfaces/current-device-context.interface';

/** Returns the device principal established by DeviceAuthGuard. */
export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentDeviceContext => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { device: CurrentDeviceContext }>();
    return request.device;
  },
);
