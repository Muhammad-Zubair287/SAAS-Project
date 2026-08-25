import { SetMetadata } from '@nestjs/common';

export const DEVICE_AUTH_KEY = 'attendance:device-auth';

/** Marks a route as requiring an opaque attendance-device token. */
export const DeviceAuth = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(DEVICE_AUTH_KEY, true);
