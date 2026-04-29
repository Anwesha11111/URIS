/**
 * RBAC role constants.
 *
 * These are the canonical role strings used everywhere in the system:
 *   - Prisma enum values (stored in the database)
 *   - JWT payload `role` field
 *   - checkRole() / requireRole() middleware arguments
 *
 * Adding a new role:
 *   1. Add it here:          ROLES.TEAM_LEAD = 'TEAM_LEAD'
 *   2. Add to Prisma schema: enum Role { INTERN ADMIN TEAM_LEAD }
 *   3. Run:                  npx prisma migrate dev
 *   4. Add to normalizeRole() map if the frontend sends a different string
 *   5. Apply requireRole() to the relevant routes
 *
 * Never use raw role strings anywhere else — always import from this file.
 */

/** @type {{ INTERN: 'INTERN', ADMIN: 'ADMIN' }} */
const ROLES = Object.freeze({
  INTERN: 'INTERN',
  ADMIN:  'ADMIN',
  // Future roles — uncomment and migrate when needed:
  // TEAM_LEAD: 'TEAM_LEAD',
  // MANAGER:   'MANAGER',
});

/**
 * All valid role values as a Set for O(1) membership checks.
 * @type {Set<string>}
 */
const VALID_ROLES = new Set(Object.values(ROLES));

/**
 * Maps any incoming role string (from API requests or UI) to a valid
 * Prisma Role enum value. Case-insensitive.
 *
 * Accepted inputs:
 *   "intern" → "INTERN"
 *   "admin"  → "ADMIN"
 *
 * Returns null for unrecognised values.
 *
 * @param {string} role
 * @returns {string | null}
 */
function normalizeRole(role) {
  if (typeof role !== 'string') return null;
  const map = {
    intern: ROLES.INTERN,
    admin:  ROLES.ADMIN,
    // Add aliases for future roles here:
    // team_lead: ROLES.TEAM_LEAD,
    // manager:   ROLES.MANAGER,
  };
  return map[role.toLowerCase()] ?? null;
}

module.exports = { ROLES, VALID_ROLES, normalizeRole };
