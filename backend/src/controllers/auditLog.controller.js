const prisma = require('../utils/prisma');

/**
 * GET /audit-logs
 *
 * Returns paginated audit logs. Admin only.
 *
 * Query params:
 *   action   — filter by action string (e.g. "LOGIN")
 *   entity   — filter by entity string (e.g. "TASK")
 *   userId   — filter by acting user ID
 *   from     — ISO date string, start of range
 *   to       — ISO date string, end of range
 *   page     — page number (default 1)
 *   limit    — records per page (default 25, max 100)
 */
async function getAuditLogs(req, res, next) {
  try {
    const {
      action,
      entity,
      userId,
      from,
      to,
      page  = '1',
      limit = '25',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip     = (pageNum - 1) * limitNum;

    // Build filter
    const where = {};
    if (action) where.action   = action;
    if (entity) where.entity   = entity;
    if (userId) where.userId   = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs };
