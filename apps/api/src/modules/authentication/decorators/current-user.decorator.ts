import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';

// Extracts the authenticated user context from request.user (populated by JwtStrategy).
// Use on controller action parameters guarded by JwtAuthGuard:
//
//   @UseGuards(JwtAuthGuard)
//   @Get('profile')
//   getProfile(@CurrentUser() user: CurrentUserContext) { ... }
//
// Note: The existing @CurrentUser() in common/decorators/ reads request.platformActor
// and serves M01 platform routes (PlatformActorMiddleware / PlatformRoleGuard).
// This decorator serves M02+ routes via the JWT strategy.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserContext }>();
    return request.user;
  },
);
