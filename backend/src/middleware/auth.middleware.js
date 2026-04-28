const jwt   = require('jsonwebtoken');
const { ROLES, VALID_ROLES } = require('../constants/roles');

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
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      data:    null,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:    decoded.id,
      email: decoded.email,
      role:  decoded.role,   // uppercase Prisma enum value e.g. 'ADMIN'
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      data:    null,
    });
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
 * router.post('/create-task', verifyToken, requireRole(ROLES.ADMIN), createTask)
 *
 * // Multiple roles (any of these may access the route)
 * router.get('/report', verifyToken, requireRole(ROLES.ADMIN, ROLES.TEAM_LEAD), getReport)
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
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        data:    null,
      });
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

module.exports = { verifyToken, requireRole, checkRole };
