import { SetMetadata } from '@nestjs/common';

export const API_CLIENT_AUTH_KEY = 'api_client_auth';

// Marks a route or controller as requiring API client authentication.
// ApiClientGuard reads this metadata to decide whether to enforce client auth.
export const ApiClientAuth = (): MethodDecorator & ClassDecorator =>
  SetMetadata(API_CLIENT_AUTH_KEY, true);
