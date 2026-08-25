/**
 * LOCAL DEV ONLY — M07 Phase 2 closeout identities B/C.
 * Password from /tmp/wcos-smoke/password.txt (never printed).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import {
  ATTENDANCE_POLICY_PERMISSIONS,
  ROSTER_PERMISSIONS,
  SHIFT_PERMISSIONS,
} from '../src/common/constants/permissions.constants';
import { ensureM07PermissionsForTenant } from '../src/database/seed/m07-permissions.seed';

const prisma = new PrismaClient();

/** Supporting org/people reads required by Assign Shift selectors (not M07 catalogue). */
const SELECTOR_SUPPORT_CODES = [
  'read:employee:tenant',
  'read:department:tenant',
  'read:branch:tenant',
];

const ASSIGN_ONLY = [
  SHIFT_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.ASSIGN,
  ATTENDANCE_POLICY_PERMISSIONS.READ,
  ...SELECTOR_SUPPORT_CODES,
];
const READ_ONLY = [SHIFT_PERMISSIONS.READ, ROSTER_PERMISSIONS.READ];
const MANAGER_CODES = [
  SHIFT_PERMISSIONS.READ,
  SHIFT_PERMISSIONS.CREATE,
  SHIFT_PERMISSIONS.UPDATE,
  ROSTER_PERMISSIONS.READ,
  ROSTER_PERMISSIONS.ASSIGN,
  ROSTER_PERMISSIONS.OVERRIDE,
  ATTENDANCE_POLICY_PERMISSIONS.READ,
  ...SELECTOR_SUPPORT_CODES,
];

async function ensurePermission(code: string) {
  return prisma.permission.upsert({
    where: {
      action_resource_scope: { action: code, resource: '.', scope: '.' },
    },
    create: {
      action: code,
      resource: '.',
      scope: '.',
      description: `M07 closeout: ${code}`,
    },
    update: {},
  });
}

async function ensureExactRole(tenantId: string, name: string, codes: string[]) {
  let role = await prisma.role.findFirst({ where: { tenantId, name } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId,
        name,
        description: `M07 Phase 2 closeout: ${name}`,
        isSystem: true,
      },
    });
  }
  const desired = [];
  for (const code of codes) desired.push(await ensurePermission(code));
  const existing = await prisma.rolePermission.findMany({
    where: { roleId: role.id },
    include: { permission: true },
  });
  for (const rp of existing) {
    if (!codes.includes(rp.permission.action)) {
      await prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: rp.permissionId,
          },
        },
      });
    }
  }
  for (const perm of desired) {
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

async function ensureUser(
  tenantId: string,
  email: string,
  displayName: string,
  roleId: string,
  password: string,
) {
  const hash = await bcrypt.hash(password, 12);
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
      data: { status: 'ACTIVE', isActive: true, displayName },
    });
  }
  const cred = await prisma.passwordCredential.findUnique({
    where: { userId: user.id },
  });
  if (!cred) {
    await prisma.passwordCredential.create({
      data: { userId: user.id, passwordHash: hash },
    });
  } else {
    await prisma.passwordCredential.update({
      where: { userId: user.id },
      data: { passwordHash: hash },
    });
  }
  const other = await prisma.roleAssignment.findMany({
    where: { userId: user.id, tenantId },
  });
  for (const a of other) {
    if (a.roleId !== roleId) {
      await prisma.roleAssignment.delete({ where: { id: a.id } });
    }
  }
  const assignment = await prisma.roleAssignment.findFirst({
    where: { userId: user.id, roleId, tenantId },
  });
  if (!assignment) {
    await prisma.roleAssignment.create({
      data: { userId: user.id, roleId, tenantId, grantedBy: null },
    });
  }
  return user;
}

async function main() {
  const bootRaw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(bootRaw.slice(bootRaw.lastIndexOf('{'))) as {
    tenantId: string;
    managerEmail: string;
  };
  const password = fs
    .readFileSync('/tmp/wcos-smoke/password.txt', 'utf8')
    .trim();
  if (password.length < 12) throw new Error('password.txt invalid');

  await ensureM07PermissionsForTenant(prisma, boot.tenantId);

  const managerRole = await prisma.role.findFirst({
    where: { tenantId: boot.tenantId, name: 'SMOKE Attendance Manager' },
  });
  if (managerRole) {
    for (const code of MANAGER_CODES) {
      const perm = await ensurePermission(code);
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: perm.id,
          },
        },
        create: { roleId: managerRole.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  const assignRole = await ensureExactRole(
    boot.tenantId,
    'SMOKE M07 Assigner',
    ASSIGN_ONLY,
  );
  const readerRole = await ensureExactRole(
    boot.tenantId,
    'SMOKE M07 Reader',
    READ_ONLY,
  );

  const assigner = await ensureUser(
    boot.tenantId,
    'smoke.m07.assigner@m07.local',
    'SMOKE M07 Assigner',
    assignRole.id,
    password,
  );
  const reader = await ensureUser(
    boot.tenantId,
    'smoke.m07.reader@m07.local',
    'SMOKE M07 Reader',
    readerRole.id,
    password,
  );

  const out = {
    ok: true,
    tenantId: boot.tenantId,
    managerEmail: boot.managerEmail,
    assignerEmail: assigner.email,
    readerEmail: reader.email,
    assignerUserId: assigner.id,
    readerUserId: reader.id,
  };
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase2-identities.json',
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
