const jwt   = require('jsonwebtoken');
const { ROLES, VALID_ROLES } = require('../constants/roles');
const { authError, forbidden } = require('../utils/respond');

/**
 * verifyToken
 *
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Attaches { id, email, role } to req.user on success.
 *
 * Returns 401 for missing, malformed, expired, or invalid tokens.
 * Never exposes the raw JWT error to the client.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return authError(res, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:     decoded.id,
      email:  decoded.email,
      role:   decoded.role,
      teamId: decoded.teamId ?? null,   // Phase 2: team context from JWT
    };
    next();
  } catch {
    return authError(res, 'Invalid or expired token.');
  }
}

/**
 * requireRole(...roles)
 *
 * Middleware factory that enforces one or more allowed roles.
 * Must be used after verifyToken.
 *
 * Accepts any number of role arguments from the ROLES constant.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * Scalability: adding a new role only requires updating ROLES in
 * constants/roles.js — no changes needed here.
 *
 * @param {...string} roles - One or more values from ROLES constant
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Single role
 * router.post('/create-task', verifyToken, requireRole(ROLES.CORE_ADMIN), createTask)
 *
 * // Multiple roles (any of these may access the route)
 * router.get('/report', verifyToken, requireRole(ROLES.CORE_ADMIN, ROLES.TECHNICAL_LEAD), getReport)
 */
function requireRole(...roles) {
  // Validate at startup — catch typos before any request is made
  for (const role of roles) {
    if (!VALID_ROLES.has(role)) {
      throw new Error(
        `requireRole: "${role}" is not a valid role. ` +
        `Valid roles: ${[...VALID_ROLES].join(', ')}`
      );
    }
  }

  const allowed = new Set(roles);

  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      const { logAction } = require('../utils/auditLogger');
      
      if (req.user) {
        void logAction(
          req.user.id, 
          'UNAUTHORIZED_ACCESS', 
          'SYSTEM', 
          null, 
          {
            attemptedRole: req.user.role,
            requiredRoles: roles,
            path: req.originalUrl,
            method: req.method
          }
        );
      }
      return forbidden(res, 'Access denied. Insufficient permissions.');
    }
    next();
  };
}

/**
 * checkRole (legacy alias)
 *
 * @deprecated Use requireRole() instead.
 * Kept for backward compatibility — all existing routes continue to work.
 *
 * @param {string} role
 * @returns {import('express').RequestHandler}
 */
function checkRole(role) {
  return requireRole(role);
}

/**
 * authorize(check)
 *
 * Lightweight, composable permission middleware for resource-level checks.
 * Runs AFTER verifyToken — req.user is guaranteed to be populated.
 *
 * The `check` function receives req and returns true (allow) or false (deny).
 * This keeps route-level authorization logic close to the route definition
 * without polluting the middleware layer with business rules.
 *
 * Design principles:
 *  - Simple: one function, one boolean return
 *  - Composable: chain multiple authorize() calls for AND logic
 *  - Extensible: check can be async for DB-backed permission checks
 *  - No hardcoded role lists here — those belong in the route file
 *
 * @param {(req: import('express').Request) => boolean | Promise<boolean>} check
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Only allow the resource owner or an admin
 * router.get('/tasks/:id',
 *   verifyToken,
 *   authorize(req => req.user.id === req.params.id || req.user.role === ROLES.CORE_ADMIN),
 *   getTask
 * )
 *
 * // Team-scoped: only allow if user belongs to the team
 * router.get('/teams/:teamId/data',
 *   verifyToken,
 *   authorize(req => req.user.teamId === req.params.teamId || req.user.role === ROLES.CORE_ADMIN),
 *   getTeamData
 * )
 */
function authorize(check) {
  return async (req, res, next) => {
    try {
      const allowed = await check(req);
      if (!allowed) {
        return forbidden(res, 'Access denied. Insufficient permissions.');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { verifyToken, requireRole, checkRole, authorize };
