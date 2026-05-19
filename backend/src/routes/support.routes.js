/**
 * support.routes.js — Phase 5 (extended from Phase 3)
 *
 * Intern routes:
 *   POST  /support              — submit a new request
 *   GET   /support/my           — list own requests (no internal notes)
 *   GET   /support/my/:id       — get own request detail (no internal notes)
 *
 * Admin/Lead routes:
 *   GET   /support              — list all requests (filterable)
 *   GET   /support/:id          — get full request detail (includes internal notes)
 *   PATCH /support/:id/assign   — assign to admin/lead
 *   PATCH /support/:id/status   — update status (lifecycle-validated)
 *   PATCH /support/:id/notes    — add/update internal notes (never shown to interns)
 */

'use strict';

const express = require('express');
const router  = express.Router();
const {
  submitRequest,
  getMyRequests,
  getMyRequestById,
  getAllRequests,
  getRequestById,
  assignRequest,
  updateRequestStatus,
  updateInternalNotes,
} = require('../controllers/support.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

// Roles that can manage support requests
const SUPPORT_ADMIN_ROLES = [
  ROLES.CORE_ADMIN,
  ROLES.TECHNICAL_LEAD,
  ROLES.OPERATIONS_LEAD,
  ROLES.RESEARCH_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
];

// ── Intern routes — any authenticated user ────────────────────────────────────
// Order matters: /my/:id must come before /:id to avoid route collision
router.post('/',         verifyToken, submitRequest);
router.get('/my',        verifyToken, getMyRequests);
router.get('/my/:id',    verifyToken, getMyRequestById);

// ── Admin/Lead routes ─────────────────────────────────────────────────────────
router.get('/',                  verifyToken, requireRole(...SUPPORT_ADMIN_ROLES), getAllRequests);
router.get('/:id',               verifyToken, requireRole(...SUPPORT_ADMIN_ROLES), getRequestById);
router.patch('/:id/assign',      verifyToken, requireRole(...SUPPORT_ADMIN_ROLES), assignRequest);
router.patch('/:id/status',      verifyToken, requireRole(...SUPPORT_ADMIN_ROLES), updateRequestStatus);
router.patch('/:id/notes',       verifyToken, requireRole(...SUPPORT_ADMIN_ROLES), updateInternalNotes);

module.exports = router;
