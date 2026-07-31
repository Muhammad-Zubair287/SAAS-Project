import { SetMetadata } from '@nestjs/common';
import type { PlatformPermission } from '../constants/permissions.constants';

export const PERMISSIONS_METADATA_KEY = 'required_permissions';

export const RequirePermissions = (...permissions: PlatformPermission[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
