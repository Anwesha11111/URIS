const prisma = require('../utils/prisma');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { ok } = require('../utils/respond');

async function getActivitySummary(req, res, next) {
  try {
    const isAdmin  = req.user.role === 'ADMIN';
    const targetId = isAdmin && req.query.userId ? req.query.userId : req.user.id;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);

    const activities = await prisma.activity.findMany({
      where:   { userId: targetId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    let totalActiveSeconds = 0;
    let totalIdleSeconds   = 0;
    let loginCount         = 0;

    for (const a of activities) {
      if (a.type === ACTIVITY_TYPES.TASK_WORK && a.duration) totalActiveSeconds += a.duration;
      if (a.type === ACTIVITY_TYPES.IDLE       && a.duration) totalIdleSeconds   += a.duration;
      if (a.type === ACTIVITY_TYPES.LOGIN)                    loginCount++;
    }

    const totalActiveHours  = +(totalActiveSeconds / 3600).toFixed(2);
    const totalIdleHours    = +(totalIdleSeconds   / 3600).toFixed(2);
    const combined          = totalActiveHours + totalIdleHours;
    const productivityScore = combined > 0
      ? Math.round((totalActiveHours / combined) * 100)
      : 0;

    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, activeHours: 0, idleHours: 0 };
    }

    for (const a of activities) {
      const key = a.timestamp.toISOString().split('T')[0];
      if (!dailyMap[key]) continue;
      if (a.type === ACTIVITY_TYPES.TASK_WORK && a.duration)
        dailyMap[key].activeHours = +(dailyMap[key].activeHours + a.duration / 3600).toFixed(2);
      if (a.type === ACTIVITY_TYPES.IDLE && a.duration)
        dailyMap[key].idleHours = +(dailyMap[key].idleHours + a.duration / 3600).toFixed(2);
    }

    return ok(res, {
      totalActiveHours,
      totalIdleHours,
      loginCount,
      productivityScore,
      dailyBreakdown: Object.values(dailyMap),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getActivitySummary };
