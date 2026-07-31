import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ApiClientAuthService } from '../services/api-client-auth.service';
import { API_CLIENT_AUTH_KEY } from '../decorators/api-client-auth.decorator';
import type { CurrentApiClientContext } from '../interfaces/current-api-client-context.interface';

// ApiClientGuard authenticates machine-to-machine requests using clientId + clientSecret.
//
// Credential sources (first match wins):
//   1. Authorization: Basic base64(clientId:clientSecret)
//   2. X-API-CLIENT-ID  +  X-API-CLIENT-SECRET  headers
//
// On success, populates request.apiClient with CurrentApiClientContext.
// Apply via @UseGuards(ApiClientGuard) combined with @ApiClientAuth() on the route.
// Routes without @ApiClientAuth() metadata are passed through (guard is a no-op).

type AuthenticatedRequest = Request & { apiClient: CurrentApiClientContext };

@Injectable()
export class ApiClientGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiClientAuthService: ApiClientAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresClientAuth = this.reflector.getAllAndOverride<boolean>(API_CLIENT_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresClientAuth) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

    const credentials = this.extractCredentials(request);
    if (!credentials) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'API client credentials are required.',
      });
    }

    const clientContext = await this.apiClientAuthService.authenticate(
      credentials.clientId,
      credentials.clientSecret,
      correlationId,
    );

    request.apiClient = clientContext;
    return true;
  }

  private extractCredentials(
    req: Request,
  ): { clientId: string; clientSecret: string } | null {
    // Option 1: Authorization: Basic base64(clientId:clientSecret)
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Basic ')) {
      const encoded = authHeader.slice(6);
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx > 0) {
        return {
          clientId: decoded.slice(0, colonIdx),
          clientSecret: decoded.slice(colonIdx + 1),
        };
      }
    }

    // Option 2: X-API-CLIENT-ID + X-API-CLIENT-SECRET headers
    const clientId = req.headers['x-api-client-id'] as string | undefined;
    const clientSecret = req.headers['x-api-client-secret'] as string | undefined;
    if (clientId && clientSecret) {
      return { clientId, clientSecret };
    }

    return null;
  }
}
