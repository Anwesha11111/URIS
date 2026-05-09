const { resolveAlert } = require('../services/alertService');
const { ok, notFound, forbidden } = require('../utils/respond');
const prisma = require('../utils/prisma');

async function getAlerts(req, res, next) {
  try {
    const { type, severity, includeResolved } = req.query;
    const take = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.offset, 10) || 0;

    const where = {};
    // By default only return unresolved; pass includeResolved=true to get all
    if (includeResolved !== 'true') where.resolved = false;
    if (type)     where.type     = type;
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return ok(res, alerts, `${alerts.length} alert(s).`);
  } catch (err) {
    next(err);
  }
}

async function resolveAlertById(req, res, next) {
  const { id } = req.params;
  try {
    const updated = await resolveAlert(id);
    return ok(res, updated, 'Alert resolved.');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /alerts/my/:id/resolve
 * Intern resolves one of their own alerts.
 * Verifies the alert belongs to the requesting intern before resolving.
 */
async function resolveMyAlertById(req, res, next) {
  const { id } = req.params;
  try {
    // Resolve the intern record for the authenticated user
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) return notFound(res, 'Intern not found');

    // Fetch the alert and verify ownership
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) return notFound(res, 'Alert not found');
    if (alert.internId !== intern.id) {
      return forbidden(res, 'You can only resolve your own alerts');
    }

    const updated = await resolveAlert(id);
    return ok(res, updated, 'Alert resolved.');
  } catch (err) {
    next(err);
  }
}

async function getMyAnomalyAlerts(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return notFound(res, 'Intern not found');
    }
    const internId = intern.id;

    const { type, severity, includeResolved } = req.query;

    const INTERN_ALERT_TYPES = [
      'low_performance', 'spike', 'task_assigned', 'task_paused',
      'blocker_reported', 'review_submitted', 'deadline_approaching',
      'availability_reminder', 'stale_task', 'overload', 'low_capacity',
    ];

    const where = {
      internId,
      type: type ? type : { in: INTERN_ALERT_TYPES },
    };
    // By default only unresolved; pass includeResolved=true to get history
    if (includeResolved !== 'true') where.resolved = false;
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    100,
    });

    return ok(res, alerts);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlerts, resolveAlertById, resolveMyAlertById, getMyAnomalyAlerts };
