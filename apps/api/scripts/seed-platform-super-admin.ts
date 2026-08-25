/**
 * LOCAL / BOOTSTRAP ONLY — idempotent Platform Super Admin seed.
 *
 * Usage (from apps/api):
 *   PLATFORM_SUPER_ADMIN_PASSWORD='***' npx ts-node --transpile-only scripts/seed-platform-super-admin.ts
 *
 * Optional:
 *   PLATFORM_SUPER_ADMIN_EMAIL=zubair.m1815@gmail.com
 *   PLATFORM_SUPER_ADMIN_DISPLAY_NAME='Platform Super Admin'
 *   BCRYPT_ROUNDS=12
 *
 * Never prints the password. Safe to re-run.
 */
import { PrismaClient } from '@prisma/client';
import { seedPlatformSuperAdmin } from '../src/database/seed/platform-super-admin.seed';

const prisma = new PrismaClient();

async function main() {
  const result = await seedPlatformSuperAdmin(prisma);

  // Identity summary only — never print password or password hash.
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: result.action,
        userId: result.userId,
        email: result.email,
        platformRole: result.platformRole,
        status: result.status,
        hasPasswordCredential: result.hasPasswordCredential,
        platformRoleAssignmentId: result.platformRoleAssignmentId,
        tenantScoped: false,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
