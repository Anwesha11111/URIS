/**
 * Frontend RBAC role constants.
 *
 * These match the LOWERCASE role strings returned by the backend login API.
 * The backend stores roles as uppercase enums (e.g. TECHNICAL_INTERN) but
 * the login response lowercases them before sending to the client.
 *
 * Backward compatibility:
 *   ROLES.ADMIN  → 'core_admin'   (was 'admin')
 *   ROLES.INTERN → 'technical_intern' (was 'intern')
 *   Both old aliases are kept so any existing call-sites don't break.
 *
 * Adding a new role:
 *   1. Add it here
 *   2. Add to the Role union type below
 *   3. Update isAdmin() in authStore.ts if it needs admin-level access
 *   4. Add to ROLE_PERMISSIONS in permissions.ts
 *   5. Add to ProtectedRoute / RoleGuard allow lists as needed
 *
 * Never use raw role strings in components — always import from here.
 */

export const ROLES = Object.freeze({
  // ── Admin / Lead tier ──────────────────────────────────────────────────────
  CORE_ADMIN:                 'core_admin',
  TECHNICAL_LEAD:             'technical_lead',
  OPERATIONS_LEAD:            'operations_lead',
  RESEARCH_LEAD:              'research_lead',
  OPERATIONS_PROGRAM_MANAGER: 'operations_program_manager',

  // ── Intern tier ────────────────────────────────────────────────────────────
  TECHNICAL_INTERN:           'technical_intern',
  OPERATIONS_INTERN:          'operations_intern',
  RESEARCH_INTERN:            'research_intern',

  // ── Special roles ──────────────────────────────────────────────────────────
  OBSERVER_TEAM_LEAD:         'observer_team_lead',
  COLLABORATOR_LEAD:          'collaborator_lead',
  ORENDA_MEMBER:              'orenda_member',
  PAST_EMPLOYEE:              'past_employee',

  // ── Backward-compat aliases ────────────────────────────────────────────────
  /** @deprecated Use ROLES.CORE_ADMIN */
  ADMIN:  'core_admin',
  /** @deprecated Use ROLES.TECHNICAL_INTERN */
  INTERN: 'technical_intern',
} as const)

/**
 * Union type of all valid frontend role strings.
 * Derived from the ROLES object so it stays in sync automatically.
 */
export type Role = typeof ROLES[keyof typeof ROLES]

/**
 * Roles that have admin-level access (can see admin pages, manage users, etc.)
 * Used by ProtectedRoute adminOnly shorthand and isAdmin() in authStore.
 */
export const ADMIN_ROLES: Role[] = [
  ROLES.CORE_ADMIN,
  ROLES.TECHNICAL_LEAD,
  ROLES.OPERATIONS_LEAD,
  ROLES.RESEARCH_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
  ROLES.OBSERVER_TEAM_LEAD,
  ROLES.COLLABORATOR_LEAD,
]

/**
 * Roles that are intern-tier (personal data only, no team management).
 */
export const INTERN_ROLES: Role[] = [
  ROLES.TECHNICAL_INTERN,
  ROLES.OPERATIONS_INTERN,
  ROLES.RESEARCH_INTERN,
  ROLES.ORENDA_MEMBER,
]
