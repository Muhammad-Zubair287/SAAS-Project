/**
 * LOCAL DEV — upsert M07 shift + roster permissions and attach to smoke manager.
 * Prefer scripts/seed-m07-permissions.ts for production-oriented catalogue seeding.
 */
import { PrismaClient } from '@prisma/client';
import { seedM07Permissions } from '../src/database/seed/m07-permissions.seed';

const prisma = new PrismaClient();

seedM07Permissions(prisma)
  .then((result) => {
    console.log(
      JSON.stringify({
        ok: true,
        permissions: result.permissions,
        rolesUpdated: result.rolesUpdated,
      }),
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
