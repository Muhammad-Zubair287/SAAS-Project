/**
 * CLI: seed ESS permissions + Employee role for all tenants (or one via TENANT_ID).
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seed/run-ess-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensureEssPermissionsForTenant, seedEssPermissions } from './ess-permissions.seed';

async function main() {
  const prisma = new PrismaClient();
  const tenantId = process.env['TENANT_ID'];
  try {
    if (tenantId) {
      await ensureEssPermissionsForTenant(prisma, tenantId);
      console.log(`ESS permissions ensured for tenant ${tenantId}`);
    } else {
      const tenants = await prisma.tenant.findMany({ select: { id: true, displayName: true } });
      for (const t of tenants) {
        await ensureEssPermissionsForTenant(prisma, t.id);
        console.log(`ESS permissions ensured for ${t.displayName} (${t.id})`);
      }
      const catalogue = await seedEssPermissions(prisma);
      console.log(`Catalogue size: ${catalogue.permissions.length}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
