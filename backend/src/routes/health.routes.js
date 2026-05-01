const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const prisma  = require('../utils/prisma');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a promise with a hard timeout.
 * Resolves to { ok: true } or { ok: false, reason: string }.
 */
async function probe(promise, timeoutMs = 3000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  try {
    await Promise.race([promise, timeout]);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Ping the database with a raw SELECT 1. */
async function checkDatabase() {
  return probe(prisma.$queryRaw`SELECT 1`, 3000);
}

/**
 * Ping Nextcloud by issuing a lightweight PROPFIND on the WebDAV root.
 * Falls back to a plain GET if env vars are missing.
 */
async function checkNextcloud() {
  const base     = process.env.NEXTCLOUD_URL || process.env.NEXTCLOUD_BASE_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!base || !username || !password) {
    return { ok: false, reason: 'not configured' };
  }

  const url    = base.endsWith('/') ? base : `${base}/`;
  const auth   = Buffer.from(`${username}:${password}`).toString('base64');

  return probe(
    axios.request({
      method : 'PROPFIND',
      url,
      headers: {
        Authorization: `Basic ${auth}`,
        Depth        : '0',
      },
      // A PROPFIND on the root returns 207 Multi-Status; treat any 2xx/207 as up
      validateStatus: (s) => s < 500,
    }),
    3000,
  );
}

/** Ping Plane.so by fetching the workspace detail endpoint. */
async function checkPlane() {
  const base      = process.env.PLANE_BASE_URL;
  const apiKey    = process.env.PLANE_API_KEY;
  const workspace = process.env.PLANE_WORKSPACE_SLUG;

  if (!base || !apiKey || !workspace) {
    return { ok: false, reason: 'not configured' };
  }

  return probe(
    axios.get(`${base}/workspaces/${workspace}/`, {
      headers      : { 'x-api-key': apiKey },
      validateStatus: (s) => s < 500,
    }),
    3000,
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /health/live
 *
 * Liveness probe — answers "is the process alive?"
 * Kubernetes restarts the pod if this returns non-2xx.
 * Keep it trivial: no I/O, no DB. If Express can respond, the app is alive.
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * GET /health/ready
 *
 * Readiness probe — answers "can this instance serve traffic?"
 * Kubernetes stops routing requests here until this returns 200.
 * Checks the database (required) and optional external services.
 */
router.get('/ready', async (req, res) => {
  // Database is required — failure means not ready
  const db = await checkDatabase();
  if (!db.ok) {
    return res.status(503).json({
      status: 'not_ready',
      reason: `database disconnected (${db.reason})`,
    });
  }

  // Optional services — failure degrades but doesn't block readiness
  const [nextcloud, plane] = await Promise.all([
    checkNextcloud(),
    checkPlane(),
  ]);

  const degraded = [];
  if (!nextcloud.ok) degraded.push(`nextcloud: ${nextcloud.reason}`);
  if (!plane.ok)     degraded.push(`plane: ${plane.reason}`);

  if (degraded.length > 0) {
    return res.json({
      status  : 'ready',
      warnings: degraded,
    });
  }

  return res.json({ status: 'ready' });
});

/**
 * GET /health — full diagnostic (existing production health check)
 * public, no auth required
 */
router.get('/', async (req, res) => {
  // Run all checks concurrently for speed
  const [db, nextcloud, plane] = await Promise.all([
    checkDatabase(),
    checkNextcloud(),
    checkPlane(),
  ]);

  const services = {
    database : db.ok        ? 'connected'    : `disconnected (${db.reason})`,
    nextcloud: nextcloud.ok ? 'connected'    : `unreachable (${nextcloud.reason})`,
    plane    : plane.ok     ? 'connected'    : `unreachable (${plane.reason})`,
  };

  // Determine overall status
  let status;
  if (!db.ok) {
    status = 'DOWN';
  } else if (!nextcloud.ok || !plane.ok) {
    status = 'DEGRADED';
  } else {
    status = 'OK';
  }

  const httpStatus = status === 'DOWN' ? 503 : 200;

  return res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    uptime   : process.uptime(),
    services,
  });
});

module.exports = router;
