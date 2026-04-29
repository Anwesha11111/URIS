/**
 * Frontend RBAC role constants.
 *
 * These match the lowercase role strings returned by the backend login API
 * (backend stores 'INTERN'/'ADMIN', login response lowercases them).
 *
 * Adding a new role:
 *   1. Add it here:                ROLES.TEAM_LEAD = 'team_lead'
 *   2. Add to UserRole union type in authStore.ts
 *   3. Update isAdmin() in authStore.ts if the new role has admin-level access
 *   4. Add to RoleGuard / ProtectedRoute allow lists as needed
 *
 * Never use raw role strings in components — always import from here.
 */

export const ROLES = Object.freeze({
  INTERN: 'intern',
  ADMIN:  'admin',
  // Future roles — uncomment when backend supports them:
  // TEAM_LEAD: 'team_lead',
  // MANAGER:   'manager',
} as const)

/** Union type of all valid frontend role strings. */
export type Role = typeof ROLES[keyof typeof ROLES]
