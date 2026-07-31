import { Injectable } from '@nestjs/common';

export interface ResolvedPermissions {
  permissions: string[];
  roles: string[];
}

interface CacheEntry {
  data: ResolvedPermissions;
  cachedAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(userId: string, tenantId: string | null): ResolvedPermissions | null {
    const entry = this.cache.get(this.key(userId, tenantId));
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TTL_MS) {
      this.cache.delete(this.key(userId, tenantId));
      return null;
    }
    return entry.data;
  }

  set(userId: string, tenantId: string | null, data: ResolvedPermissions): void {
    this.cache.set(this.key(userId, tenantId), { data, cachedAt: Date.now() });
  }

  invalidate(userId: string, tenantId: string | null): void {
    this.cache.delete(this.key(userId, tenantId));
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private key(userId: string, tenantId: string | null): string {
    return `${tenantId ?? 'platform'}:${userId}`;
  }
}
