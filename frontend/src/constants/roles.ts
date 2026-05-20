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
  CORE_ADMIN: 'core_admin',
  TECHNICAL_LEAD: 'technical_lead',
  OPERATIONS_LEAD: 'operations_lead',
  RESEARCH_LEAD: 'research_lead',
  OPERATIONS_PROGRAM_MANAGER: 'operations_program_manager',
  TECHNICAL_INTERN: 'technical_intern',
  OPERATIONS_INTERN: 'operations_intern',
  RESEARCH_INTERN: 'research_intern',
  ORENDA_MEMBER: 'orenda_member',
  OBSERVER_TEAM_LEAD: 'observer_team_lead',
  COLLABORATOR_LEAD: 'collaborator_lead',
  PAST_EMPLOYEE: 'past_employee',
} as const)

/** Union type of all valid frontend role strings. */
export type Role = typeof ROLES[keyof typeof ROLES]

export const ADMIN_ROLES = [
  'core_admin',
  'technical_lead',
  'operations_lead',
  'research_lead',
  'operations_program_manager',
] as const
