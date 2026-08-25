/**
 * Idempotent bootstrap for the local Platform Super Admin account.
 *
 * Creates (or repairs) an AppUser with platformRole=PLATFORM_SUPER_ADMIN,
 * ACTIVE status, bcrypt PasswordCredential, and a PlatformRoleAssignment.
 * No tenant membership is created — this is platform-scoped only.
 *
 * Password is NEVER hardcoded. Provide PLATFORM_SUPER_ADMIN_PASSWORD via env.
 * Email defaults for local bootstrap; override with PLATFORM_SUPER_ADMIN_EMAIL.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PlatformRole } from '../../common/enums/platform.enum';

const DEFAULT_EMAIL = 'zubair.m1815@gmail.com';
const DEFAULT_DISPLAY_NAME = 'Platform Super Admin';

export interface SeedPlatformSuperAdminResult {
  action: 'created' | 'updated';
  userId: string;
  email: string;
  platformRole: string;
  status: string;
  hasPasswordCredential: boolean;
  platformRoleAssignmentId: string;
}

export async function seedPlatformSuperAdmin(
  prisma: PrismaClient,
  options?: {
    email?: string;
    password?: string;
    displayName?: string;
    bcryptRounds?: number;
  },
): Promise<SeedPlatformSuperAdminResult> {
  const email = (options?.email ?? process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? DEFAULT_EMAIL)
    .trim()
    .toLowerCase();
  const password =
    options?.password ?? process.env.PLATFORM_SUPER_ADMIN_PASSWORD ?? '';
  const displayName =
    options?.displayName ??
    process.env.PLATFORM_SUPER_ADMIN_DISPLAY_NAME ??
    DEFAULT_DISPLAY_NAME;
  const rounds = options?.bcryptRounds ?? parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  if (!email || !email.includes('@')) {
    throw new Error('PLATFORM_SUPER_ADMIN_EMAIL must be a valid email address.');
  }
  if (!password || password.length < 8) {
    throw new Error(
      'Set PLATFORM_SUPER_ADMIN_PASSWORD (>=8 chars) before running platform super-admin seed.',
    );
  }

  const platformRole = PlatformRole.SUPER_ADMIN; // PLATFORM_SUPER_ADMIN
  const passwordHash = await bcrypt.hash(password, rounds);

  const existing = await prisma.appUser.findUnique({ where: { email } });

  let user;
  let action: 'created' | 'updated';

  if (!existing) {
    user = await prisma.appUser.create({
      data: {
        email,
        emailNormalised: email,
        displayName,
        displayNameLegacy: displayName,
        userType: 'HUMAN',
        status: 'ACTIVE',
        isActive: true,
        platformRole,
      },
    });
    action = 'created';
  } else {
    user = await prisma.appUser.update({
      where: { id: existing.id },
      data: {
        emailNormalised: email,
        displayName,
        displayNameLegacy: displayName,
        userType: 'HUMAN',
        status: 'ACTIVE',
        isActive: true,
        platformRole,
        deactivatedAt: null,
      },
    });
    action = 'updated';
  }

  const existingCred = await prisma.passwordCredential.findUnique({
    where: { userId: user.id },
  });
  if (!existingCred) {
    await prisma.passwordCredential.create({
      data: { userId: user.id, passwordHash },
    });
  } else {
    await prisma.passwordCredential.update({
      where: { userId: user.id },
      data: { passwordHash },
    });
  }

  // Ensure a single active PlatformRoleAssignment for SUPER_ADMIN.
  const activeAssignment = await prisma.platformRoleAssignment.findFirst({
    where: {
      userId: user.id,
      platformRole,
      revokedAt: null,
    },
  });

  let platformRoleAssignmentId: string;
  if (activeAssignment) {
    platformRoleAssignmentId = activeAssignment.id;
  } else {
    const created = await prisma.platformRoleAssignment.create({
      data: {
        userId: user.id,
        platformRole,
        grantedBy: null,
      },
    });
    platformRoleAssignmentId = created.id;
  }

  // Safety: never attach tenant RoleAssignments for this bootstrap identity.
  // (Idempotent seed does not create any; we do not delete unrelated assignments.)

  const credential = await prisma.passwordCredential.findUnique({
    where: { userId: user.id },
    select: { passwordHash: true },
  });

  if (!credential?.passwordHash || !credential.passwordHash.startsWith('$2')) {
    throw new Error('Password credential was not stored as a bcrypt hash.');
  }

  return {
    action,
    userId: user.id,
    email: user.email,
    platformRole: user.platformRole ?? platformRole,
    status: user.status,
    hasPasswordCredential: true,
    platformRoleAssignmentId,
  };
}
