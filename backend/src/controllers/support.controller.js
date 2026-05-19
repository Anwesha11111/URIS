/**
 * support.controller.js — Phase 5 (extended from Phase 3)
 *
 * Lightweight intern → operations/admin contact/query system.
 * NOT a realtime chat system.
 *
 * Intern endpoints:
 *   POST  /support              — submit a new request
 *   GET   /support/my           — list own requests (no internal notes)
 *   GET   /support/my/:id       — get own request detail (no internal notes)
 *
 * Admin/Lead endpoints:
 *   GET   /support              — list all requests (filterable)
 *   GET   /support/:id          — get full request detail (includes internal notes)
 *   PATCH /support/:id/assign   — assign to self or another admin
 *   PATCH /support/:id/status   — update status (with lifecycle validation)
 *   PATCH /support/:id/notes    — add/update internal notes (admin only, never shown to interns)
 */

'use strict';

const prisma = require('../utils/prisma');
const { ok, created, validationError, notFound, forbidden } = require('../utils/respond');
const { logAction } = require('../utils/auditLogger');

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'];

// Phase 5 expanded categories
const VALID_CATEGORIES = [
  'TECHNICAL_ISSUE',
  'ACCESS_PROBLEM',
  'EMERGENCY',
  'TASK_BLOCKER',
  'HR_OPERATIONS',
  'INFRASTRUCTURE',
  'GENERAL',
  'OTHER',
  // Phase 3 legacy values — kept for backward compat with existing records
  'BLOCKER',
  'OPERATIONAL',
];

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

// Valid status transitions — enforces lifecycle order
const STATUS_TRANSITIONS = {
  OPEN:        ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],  // terminal state
};

// ── Intern: submit a request ──────────────────────────────────────────────────

async function submitRequest(req, res, next) {
  try {
    const { subject, message, priority = 'MEDIUM', category = 'GENERAL' } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return validationError(res, 'subject is required');
    }
    if (subject.trim().length > 120) {
      return validationError(res, 'subject must not exceed 120 characters');
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return validationError(res, 'message is required');
    }
    if (message.trim().length > 2000) {
      return validationError(res, 'message must not exceed 2000 characters');
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return validationError(res, `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return validationError(res, `category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const request = await prisma.supportRequest.create({
      data: {
        userId:   req.user.id,
        subject:  subject.trim(),
        message:  message.trim(),
        priority,
        category,
      },
      select: {
        id: true, subject: true, priority: true, category: true,
        status: true, createdAt: true,
      },
    });

    void logAction(req.user.id, 'CREATE_SUPPORT_REQUEST', 'SUPPORT', request.id, {
      subject: request.subject, priority, category,
    });

    return created(res, request, 'Support request submitted.');
  } catch (err) {
    next(err);
  }
}

// ── Intern: list own requests (no internal notes) ─────────────────────────────

async function getMyRequests(req, res, next) {
  try {
    const requests = await prisma.supportRequest.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, subject: true, priority: true, category: true,
        status: true, createdAt: true, updatedAt: true, resolvedAt: true,
        // assignedToId exposed as a name lookup below — never raw ID
        assignedToId: true,
        // internalNotes intentionally excluded — never returned to interns
      },
    });

    // Resolve assignee names without exposing IDs
    const assigneeIds = [...new Set(requests.map(r => r.assignedToId).filter(Boolean))];
    const assignees = assigneeIds.length > 0
      ? await prisma.user.findMany({
          where:  { id: { in: assigneeIds } },
          select: { id: true, name: true },
        })
      : [];
    const assigneeMap = Object.fromEntries(assignees.map(a => [a.id, a.name]));

    const sanitized = requests.map(r => ({
      id:           r.id,
      subject:      r.subject,
      priority:     r.priority,
      category:     r.category,
      status:       r.status,
      createdAt:    r.createdAt,
      updatedAt:    r.updatedAt,
      resolvedAt:   r.resolvedAt,
      assignedTo:   r.assignedToId ? (assigneeMap[r.assignedToId] ?? 'Operations Team') : null,
      // internalNotes: intentionally omitted
    }));

    return ok(res, sanitized, `${sanitized.length} request(s).`);
  } catch (err) {
    next(err);
  }
}

// ── Intern: get own request detail (no internal notes) ───────────────────────

async function getMyRequestById(req, res, next) {
  try {
    const { id } = req.params;

    const request = await prisma.supportRequest.findUnique({
      where: { id },
      select: {
        id: true, subject: true, message: true, priority: true, category: true,
        status: true, createdAt: true, updatedAt: true, resolvedAt: true,
        assignedToId: true,
        // internalNotes intentionally excluded
      },
    });

    if (!request) return notFound(res, 'Support request not found');

    // Ownership check — interns can only see their own requests
    const original = await prisma.supportRequest.findUnique({
      where:  { id },
      select: { userId: true },
    });
    if (original?.userId !== req.user.id) {
      return forbidden(res, 'You can only view your own requests');
    }

    // Resolve assignee name
    let assignedTo = null;
    if (request.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where:  { id: request.assignedToId },
        select: { name: true },
      });
      assignedTo = assignee?.name ?? 'Operations Team';
    }

    return ok(res, { ...request, assignedTo, assignedToId: undefined });
  } catch (err) {
    next(err);
  }
}

// ── Admin/Lead: list all requests ─────────────────────────────────────────────

async function getAllRequests(req, res, next) {
  try {
    const { status, priority, category } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const where = {};
    if (status   && VALID_STATUSES.includes(status))     where.status   = status;
    if (priority && VALID_PRIORITIES.includes(priority)) where.priority = priority;
    if (category && VALID_CATEGORIES.includes(category)) where.category = category;

    const [total, requests] = await Promise.all([
      prisma.supportRequest.count({ where }),
      prisma.supportRequest.findMany({
        where,
        // CRITICAL and URGENT first, then newest
        orderBy: [{ createdAt: 'desc' }],
        take:    limit,
        skip,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    // Sort by priority weight client-side after DB fetch
    const PRIORITY_WEIGHT = { CRITICAL: 5, URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    requests.sort((a, b) => {
      const wa = PRIORITY_WEIGHT[a.priority] ?? 0;
      const wb = PRIORITY_WEIGHT[b.priority] ?? 0;
      if (wb !== wa) return wb - wa;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return ok(res, {
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, `${total} request(s).`);
  } catch (err) {
    next(err);
  }
}

// ── Admin/Lead: get full request detail (includes internal notes) ─────────────

async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;

    const request = await prisma.supportRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!request) return notFound(res, 'Support request not found');

    // Resolve assignee name
    let assignedToName = null;
    if (request.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where:  { id: request.assignedToId },
        select: { name: true, email: true },
      });
      assignedToName = assignee?.name ?? assignee?.email ?? null;
    }

    return ok(res, { ...request, assignedToName });
  } catch (err) {
    next(err);
  }
}

// ── Admin/Lead: assign a request ──────────────────────────────────────────────

async function assignRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Support request not found');

    if (existing.status === 'CLOSED') {
      return validationError(res, 'Cannot assign a closed request');
    }

    const targetId = assignedToId ?? req.user.id;

    // Validate the target user exists
    const targetUser = await prisma.user.findUnique({
      where:  { id: targetId },
      select: { id: true, name: true },
    });
    if (!targetUser) return notFound(res, 'Assigned user not found');

    const updated = await prisma.supportRequest.update({
      where: { id },
      data: {
        assignedToId: targetId,
        status:       existing.status === 'OPEN' ? 'IN_PROGRESS' : existing.status,
        updatedAt:    new Date(),
      },
      select: { id: true, status: true, assignedToId: true },
    });

    void logAction(req.user.id, 'ASSIGN_SUPPORT_REQUEST', 'SUPPORT', id, {
      assignedToId:   targetId,
      assignedToName: targetUser.name,
    });

    return ok(res, { ...updated, assignedToName: targetUser.name }, 'Request assigned.');
  } catch (err) {
    next(err);
  }
}

// ── Admin/Lead: update status (with lifecycle validation) ─────────────────────

async function updateRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return validationError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Support request not found');

    // Enforce lifecycle transitions
    const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      return validationError(res,
        `Cannot transition from ${existing.status} to ${status}. ` +
        `Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`
      );
    }

    const isClosing = status === 'RESOLVED' || status === 'CLOSED';

    const updated = await prisma.supportRequest.update({
      where: { id },
      data: {
        status,
        resolvedAt: isClosing ? new Date() : existing.resolvedAt,
        closedById: isClosing ? req.user.id : existing.closedById,
        updatedAt:  new Date(),
      },
      select: { id: true, status: true, resolvedAt: true, closedById: true },
    });

    void logAction(req.user.id, 'UPDATE_SUPPORT_REQUEST_STATUS', 'SUPPORT', id, {
      previousStatus: existing.status,
      newStatus:      status,
    });

    return ok(res, updated, `Request status updated to ${status}.`);
  } catch (err) {
    next(err);
  }
}

// ── Admin/Lead: add/update internal notes (never shown to interns) ────────────

async function updateInternalNotes(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return validationError(res, 'notes must be a string');
    }
    if (notes.length > 5000) {
      return validationError(res, 'notes must not exceed 5000 characters');
    }

    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Support request not found');

    await prisma.supportRequest.update({
      where: { id },
      data:  { internalNotes: notes.trim() || null, updatedAt: new Date() },
    });

    void logAction(req.user.id, 'UPDATE_SUPPORT_NOTES', 'SUPPORT', id, {
      hasNotes: notes.trim().length > 0,
    });

    return ok(res, null, 'Internal notes updated.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitRequest,
  getMyRequests,
  getMyRequestById,
  getAllRequests,
  getRequestById,
  assignRequest,
  updateRequestStatus,
  updateInternalNotes,
};
