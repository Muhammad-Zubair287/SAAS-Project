/**
 * Production-safe bootstrap for canonical platform reference data:
 * deployment regions + entitlement catalogue (no commercial plans).
 *
 * Usage (from apps/api):
 *   npx ts-node --transpile-only scripts/seed-reference-catalogue.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedM01ReferenceCatalogue } from '../src/database/seed/m01-catalogue.seed';

const prisma = new PrismaClient();

async function main() {
  await seedM01ReferenceCatalogue();
  console.log(JSON.stringify({ ok: true, scope: 'reference-catalogue' }, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
