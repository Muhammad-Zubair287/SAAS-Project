import type { PlatformRole } from '../enums/platform.enum';

export interface PlatformActorContext {
  actorId: string;
  email: string;
  displayName: string;
  platformRole: PlatformRole;
  ipAddress?: string;
  userAgent?: string;
}
