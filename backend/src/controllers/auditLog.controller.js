const prisma = require('../utils/prisma');
const { ok } = require('../utils/respond');

async function getAuditLogs(req, res, next) {
  try {
    const { action, entity, userId, from, to, page = '1', limit = '25' } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const skip     = (pageNum - 1) * limitNum;

    const where = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
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
        include: {
          // Join user to get email — AuditLog.userId is a plain String, not a FK relation in Prisma,
          // so we do a manual lookup after fetching
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Resolve userId → email for display
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users   = userIds.length
      ? await prisma.user.findMany({
          where:  { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));

    const logsWithName = logs.map(l => ({
      ...l,
      userName: l.userId ? (userMap[l.userId] ?? l.userId) : null,
    }));

    return res.status(200).json({
      success: true,
      data: logsWithName,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs };
