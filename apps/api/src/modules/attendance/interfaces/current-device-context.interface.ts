/**
 * Request-scoped device principal populated by DeviceAuthGuard.
 * The opaque token is retained only for the duration of the request so a
 * controller can pass it to the approved ingestion service without parsing
 * credentials itself.
 */
export interface CurrentDeviceContext {
  deviceId: string;
  tenantId: string;
  expiresAt: Date;
  token: string;
  tokenHash: string;
}
