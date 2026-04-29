const { resolveAlert } = require('../services/alertService');
const prisma = require('../utils/prisma');

/**
 * GET /alerts
 * Admin only — all unresolved alerts across all interns.
 * Optional query filters: ?type=low_performance&severity=critical
 */
async function getAlerts(req, res, next) {
  try {
    const { type, severity } = req.query;

    const where = { resolved: false };
    if (type)     where.type     = type;
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      message: `${alerts.length} active alert(s).`,
      data:    alerts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /alerts/:id/resolve
 * Admin only — mark a single alert as resolved.
 */
async function resolveAlertById(req, res, next) {
  const { id } = req.params;
  try {
    const updated = await resolveAlert(id);
    return res.json({ success: true, message: 'Alert resolved.', data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /alerts/my
 * Authenticated intern — returns their own unresolved alerts.
 * Filters to anomaly types only (low_performance, spike) so interns
 * do not see admin-level blocker or reassignment alerts.
 * Optional query filters: ?type=spike&severity=critical
 */
async function getMyAnomalyAlerts(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return res.status(404).json({ success: false, message: 'Intern not found' });
    }
    const internId = intern.id;

    const { type, severity } = req.query;

    const where = {
      internId,
      resolved: false,
      type:     type
        ? type
        : { in: ['low_performance', 'spike'] },
    };
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    10,
    });

    return res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlerts, resolveAlertById, getMyAnomalyAlerts };
