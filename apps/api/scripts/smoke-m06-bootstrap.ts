/**
 * LOCAL DEV ONLY — one-shot smoke bootstrap for M06 Batch 3 runtime verification.
 * Creates catalogue rows, one ACTIVE tenant, capture permissions, two users.
 * Does not hardcode a permanent production backdoor; password comes from SMOKE_PASSWORD env.
 *
 * Usage:
 *   SMOKE_PASSWORD='...' npx ts-node --transpile-only scripts/smoke-m06-bootstrap.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { seedM01Catalogues } from '../src/database/seed/m01-catalogue.seed';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../src/common/constants/permissions.constants';

const prisma = new PrismaClient();

const CAPTURE_CODES = Object.values(ATTENDANCE_CAPTURE_PERMISSIONS);

async function ensurePermission(code: string) {
  // Dot-delimited contract codes stored with sentinel resource/scope "."
  return prisma.permission.upsert({
    where: {
      action_resource_scope: { action: code, resource: '.', scope: '.' },
    },
    create: {
      action: code,
      resource: '.',
      scope: '.',
      description: `Smoke bootstrap: ${code}`,
    },
    update: {},
  });
}

async function main() {
  const password = process.env.SMOKE_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set SMOKE_PASSWORD (>=12 chars) before running bootstrap.');
  }

  await seedM01Catalogues();

  const region = await prisma.deploymentRegion.findFirst({
    where: { status: 'ACTIVE' },
  });
  const plan = await prisma.plan.findFirst({ where: { status: 'ACTIVE' } });
  if (!region || !plan) {
    throw new Error('Catalogue seed did not create region/plan.');
  }

  const slug = 'smoke-m06-tenant';
  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        displayName: 'SMOKE M06 Tenant',
        legalName: 'SMOKE M06 Tenant Ltd',
        slug,
        countryCode: 'PK',
        baseCurrency: 'PKR',
        defaultTimezone: 'Asia/Karachi',
        defaultLocale: 'en',
        deploymentRegionId: region.id,
        planId: plan.id,
        planKey: plan.code,
        status: 'ACTIVE',
        activatedAt: new Date(),
        createdBy: 'smoke-bootstrap',
      },
    });
  } else if (tenant.status !== 'ACTIVE') {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });
  }

  const permissionRows = [];
  for (const code of CAPTURE_CODES) {
    permissionRows.push(await ensurePermission(code));
  }

  const manageCodes = new Set([
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE,
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_TOKEN_ISSUE,
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_EVENT_REVALIDATE,
    ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_MANAGE,
    ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE,
  ]);
  const readCodes = new Set([
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ,
    ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ,
  ]);

  async function ensureRole(name: string, codes: Set<string>) {
    let role = await prisma.role.findFirst({
      where: { tenantId: tenant!.id, name },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          tenantId: tenant!.id,
          name,
          description: `Smoke role ${name}`,
          isSystem: true,
        },
      });
    }
    for (const perm of permissionRows) {
      if (!codes.has(perm.action)) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
    return role;
  }

  const managerRole = await ensureRole('SMOKE Attendance Manager', manageCodes);
  const readerRole = await ensureRole('SMOKE Attendance Reader', readCodes);

  const hash = await bcrypt.hash(password, 12);

  async function ensureUser(email: string, displayName: string, roleId: string) {
    let user = await prisma.appUser.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.appUser.create({
        data: {
          email,
          emailNormalised: email.toLowerCase(),
          displayName,
          displayNameLegacy: displayName,
          userType: 'HUMAN',
          status: 'ACTIVE',
          isActive: true,
        },
      });
    } else {
      user = await prisma.appUser.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', isActive: true },
      });
    }

    const existingCred = await prisma.passwordCredential.findUnique({
      where: { userId: user.id },
    });
    if (!existingCred) {
      await prisma.passwordCredential.create({
        data: { userId: user.id, passwordHash: hash },
      });
    } else {
      await prisma.passwordCredential.update({
        where: { userId: user.id },
        data: { passwordHash: hash },
      });
    }

    const assignment = await prisma.roleAssignment.findFirst({
      where: { userId: user.id, roleId, tenantId: tenant!.id },
    });
    if (!assignment) {
      await prisma.roleAssignment.create({
        data: {
          userId: user.id,
          roleId,
          tenantId: tenant!.id,
          grantedBy: null,
        },
      });
    }

    return user;
  }

  const manager = await ensureUser(
    'smoke.manager@m06.local',
    'SMOKE Manager',
    managerRole.id,
  );
  const reader = await ensureUser(
    'smoke.reader@m06.local',
    'SMOKE Reader',
    readerRole.id,
  );

  // Safe identity summary only — never print password.
  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        managerEmail: manager.email,
        readerEmail: reader.email,
        managerUserId: manager.id,
        readerUserId: reader.id,
        permissionCount: permissionRows.length,
        bootstrapId: randomUUID(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
