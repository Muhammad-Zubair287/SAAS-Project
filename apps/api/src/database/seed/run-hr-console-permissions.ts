/**
 * Idempotent seed: upsert HR Console permissions and attach to HR Manager roles.
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seed/run-hr-console-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedHrConsolePermissions } from './hr-console-permissions.seed';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedHrConsolePermissions(prisma);
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
