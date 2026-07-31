import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';

// JwtAuthGuard wraps the 'jwt' Passport strategy.
// Apply with @UseGuards(JwtAuthGuard) to protect individual routes or controllers.
//
// Responsibilities:
//   - Invoke JwtStrategy.validate() for every guarded request.
//   - Map Passport/JWT failures to the project's standardized error format.
//
// Does NOT:
//   - Perform RBAC (use RbacGuard — Batch 7).
//   - Check permissions (use RequirePermissions decorator with PlatformRoleGuard — M01).

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // handleRequest is called by AuthGuard after passport-jwt resolves.
  // err:  thrown by JwtStrategy.validate() (e.g., AppException for locked accounts)
  // user: the CurrentUserContext returned by JwtStrategy.validate(), or false on failure
  // info: passport-jwt error object (e.g., TokenExpiredError, JsonWebTokenError)
  override handleRequest<TUser = CurrentUserContext>(
    err: Error | null,
    user: TUser | false,
    info: Error | null,
  ): TUser {
    // Propagate errors thrown explicitly by JwtStrategy (AppException subclasses).
    if (err) {
      throw err;
    }

    if (!user) {
      // Map passport-jwt info errors to structured responses.
      const message =
        info?.name === 'TokenExpiredError'
          ? 'Token has expired.'
          : info?.name === 'JsonWebTokenError'
            ? 'Invalid token.'
            : 'Authentication required.';

      throw new UnauthorizedException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message,
      });
    }

    return user;
  }
}
