/**
 * Idempotent seed: upsert Tenant Admin Console permissions and attach to Tenant Admin roles.
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seed/run-tenant-admin-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedTenantAdminPermissions } from './tenant-admin-permissions.seed';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedTenantAdminPermissions(prisma);
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          permissions: result.permissions.length,
          rolesUpdated: result.rolesUpdated,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
