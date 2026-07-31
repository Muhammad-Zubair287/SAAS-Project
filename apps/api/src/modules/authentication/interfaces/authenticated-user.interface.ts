// The AppUser record loaded from the database during JWT validation.
// Used internally by JwtStrategy; not exposed to controllers directly.
export interface AuthenticatedUser {
  id: string;
  email: string;
  emailNormalised: string | null;
  displayName: string;
  /** INVITED | ACTIVE | LOCKED | DEACTIVATED */
  status: string;
  /** Compat column — populated until platform_role_assignment guard migration (Batch 10). */
  platformRole: string | null;
  lastLoginAt: Date | null;
}
