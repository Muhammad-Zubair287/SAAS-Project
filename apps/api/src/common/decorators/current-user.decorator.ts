import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PlatformActorContext } from '../interfaces/platform-actor.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformActorContext => {
    const request = ctx.switchToHttp().getRequest<{ platformActor: PlatformActorContext }>();
    return request.platformActor;
  },
);
