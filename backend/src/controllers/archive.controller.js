/**
 * archive.controller.js — Phase 6 (extended from Phase 3)
 *
 * Admin-only endpoints for user lifecycle management.
 * All operations are non-destructive — no data is permanently deleted.
 *
 * Phase 6 additions:
 *   - reason field on all lifecycle operations
 *   - self-removal prevention (enforced in service layer)
 *   - last-admin protection (enforced in service layer)
 *   - GET /archive/users — list ALL users for lifecycle management
 */

'use strict';

const { ok, validationError, notFound } = require('../utils/respond');
const { isUUID } = require('../utils/validate');
const {
  deactivateUser,
  archiveUser,
  restoreUser,
  markRemoved,
  listArchivedUsers,
  listAllUsersForLifecycle,
} = require('../services/archiveService');

// ── Deactivate ────────────────────────────────────────────────────────────────

async function deactivate(req, res, next) {
  try {
    const { userId, reason } = req.body;
    if (!userId || !isUUID(userId)) return validationError(res, 'userId must be a valid UUID');
    const result = await deactivateUser(userId, req.user?.id ?? null, reason ?? null);
    return ok(res, result, 'User deactivated.');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, data: null });
    next(err);
  }
}

// ── Archive ───────────────────────────────────────────────────────────────────

async function archive(req, res, next) {
  try {
    const { userId, reason } = req.body;
    if (!userId || !isUUID(userId)) return validationError(res, 'userId must be a valid UUID');
    const result = await archiveUser(userId, req.user?.id ?? null, reason ?? null);
    return ok(res, result, 'User archived.');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, data: null });
    next(err);
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────

async function restore(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId || !isUUID(userId)) return validationError(res, 'userId must be a valid UUID');
    const result = await restoreUser(userId, req.user?.id ?? null);
    return ok(res, result, 'User restored to active.');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, data: null });
    next(err);
  }
}

// ── Mark Removed ──────────────────────────────────────────────────────────────

async function remove(req, res, next) {
  try {
    const { userId, reason } = req.body;
    if (!userId || !isUUID(userId)) return validationError(res, 'userId must be a valid UUID');
    const result = await markRemoved(userId, req.user?.id ?? null, reason ?? null);
    return ok(res, result, 'User marked as removed.');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, data: null });
    next(err);
  }
}

// ── List archived users (ArchivedUser table) ──────────────────────────────────

async function listArchived(req, res, next) {
  try {
    const { status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'REMOVED'];
    if (status && !VALID_STATUSES.includes(status)) {
      return validationError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const result = await listArchivedUsers({ status: status || null, page, limit });
    return ok(res, result, 'Archived users fetched.');
  } catch (err) {
    next(err);
  }
}

// ── List ALL users for lifecycle management ───────────────────────────────────
// Returns all users (active + non-active) so admins can initiate lifecycle actions.

async function listAllUsers(req, res, next) {
  try {
    const { status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const VALID_STATUSES = ['active', 'inactive', 'archived', 'removed', 'pending', 'alumni'];
    if (status && !VALID_STATUSES.includes(status)) {
      return validationError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const result = await listAllUsersForLifecycle({
      statusFilter: status || null,
      page,
      limit,
    });
    return ok(res, result, 'Users fetched.');
  } catch (err) {
    next(err);
  }
}

module.exports = { deactivate, archive, restore, remove, listArchived, listAllUsers };
