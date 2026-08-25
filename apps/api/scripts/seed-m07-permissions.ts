/**
 * Seed M07 shift + roster permissions into the global catalogue and attach
 * to existing HR/Admin-style tenant roles.
 *
 * Usage (from apps/api):
 *   npx ts-node --transpile-only scripts/seed-m07-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedM07Permissions } from '../src/database/seed/m07-permissions.seed';

const prisma = new PrismaClient();

seedM07Permissions(prisma)
  .then((result) => {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
