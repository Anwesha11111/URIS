/**
 * ipBlock.middleware.js
 *
 * Middleware that checks the client IP against the BlockedIP table before
 * any route handler runs. Blocked IPs receive a 403 immediately.
 *
 * Design decisions:
 *  - Uses a short in-memory TTL cache (30 seconds) to avoid a DB hit on
 *    every single request. The cache is invalidated automatically.
 *  - Respects X-Forwarded-For for deployments behind a reverse proxy.
 *  - Expired blocks (expiresAt < NOW) are treated as not blocked.
 *  - Errors in the block check are logged but do NOT block the request —
 *    a DB outage should not take down the entire API.
 *
 * Usage:
 *   app.use(ipBlockMiddleware)   // register before all route handlers
 *
 * Admin API for managing blocks is in admin.routes.js (Phase 2).
 */

'use strict';

const prisma  = require('../utils/prisma');
const logger  = require('../utils/logger');

// ── In-memory cache ───────────────────────────────────────────────────────────
// Maps IP → { blocked: boolean, expiresAt: number (ms timestamp) }
// Cache entries expire after CACHE_TTL_MS to pick up new blocks promptly.

const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map();

function getCached(ip) {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() > entry.cacheExpiresAt) {
    cache.delete(ip);
    return null;
  }
  return entry;
}

function setCache(ip, blocked) {
  cache.set(ip, { blocked, cacheExpiresAt: Date.now() + CACHE_TTL_MS });
}

// ── IP extraction ─────────────────────────────────────────────────────────────

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ── Middleware ────────────────────────────────────────────────────────────────

async function ipBlockMiddleware(req, res, next) {
  const ip = getClientIp(req);

  // Never block health checks — liveness probes must always pass
  if (req.path.startsWith('/health')) return next();

  // Check cache first
  const cached = getCached(ip);
  if (cached !== null) {
    if (cached.blocked) {
      logger.warn({ ip, path: req.path }, 'Blocked IP attempted access (cached)');
      return res.status(403).json({
        success: false,
        error:   'FORBIDDEN',
        message: 'Access denied.',
        data:    null,
      });
    }
    return next();
  }

  // Cache miss — check DB
  try {
    const now   = new Date();
    const block = await prisma.blockedIP.findFirst({
      where: {
        ipAddress: ip,
        OR: [
          { expiresAt: null },                // permanent block
          { expiresAt: { gt: now } },         // active temporary block
        ],
      },
    });

    if (block) {
      setCache(ip, true);
      logger.warn({ ip, reason: block.reason, path: req.path }, 'Blocked IP attempted access');
      return res.status(403).json({
        success: false,
        error:   'FORBIDDEN',
        message: 'Access denied.',
        data:    null,
      });
    }

    setCache(ip, false);
    return next();
  } catch (err) {
    // DB error — fail open (do not block legitimate traffic due to DB issues)
    logger.error({ err, ip }, 'ipBlockMiddleware: DB check failed, failing open');
    return next();
  }
}

/**
 * Invalidate the cache for a specific IP.
 * Call this after adding or removing a block so the change takes effect
 * within the next request rather than waiting for the TTL.
 *
 * @param {string} ip
 */
function invalidateCache(ip) {
  cache.delete(ip);
}

module.exports = { ipBlockMiddleware, invalidateCache };
