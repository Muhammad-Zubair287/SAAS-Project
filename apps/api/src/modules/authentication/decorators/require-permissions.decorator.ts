import { SetMetadata } from '@nestjs/common';

export type PermissionMode = 'ALL' | 'ANY';

export interface PermissionMetadata {
  permissions: string[];
  mode: PermissionMode;
}

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export const RequirePermissions = (
  permissions: string | string[],
  mode: PermissionMode = 'ALL',
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, {
    permissions: Array.isArray(permissions) ? permissions : [permissions],
    mode,
  });
