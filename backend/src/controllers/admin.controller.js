const prisma = require('../utils/prisma');
const { logAction } = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');

const VALID_TASK_STATUSES = [
  'backlog',
  'in_progress_early',
  'in_progress_mid',
  'under_review',
  'completed',
  'active',
  'paused',
];

async function overrideScore(req, res, next) {
  try {
    const { internId, overrideScore } = req.body;

    if (!internId) {
      return res.status(400).json({ success: false, message: 'internId is required', data: null });
    }
    if (typeof overrideScore !== 'number' || overrideScore < 0 || overrideScore > 100) {
      return res.status(400).json({ success: false, message: 'overrideScore must be a number between 0 and 100', data: null });
    }

    const intern = await prisma.intern.findUnique({ where: { id: internId }, select: { overrideScore: true } });
    const previousScore = intern?.overrideScore ?? null;

    await prisma.intern.update({
      where: { id: internId },
      data:  { overrideScore },
    });

    void logAction(req.user?.id ?? null, AUDIT_ACTIONS.OVERRIDE_SCORE, AUDIT_ENTITIES.SCORE, internId, {
      internId,
      previousScore,
      newScore: overrideScore,
      reason:   req.body.reason ?? null,
    });

    return res.status(200).json({ success: true, message: 'Score overridden successfully', data: null });
  } catch (err) {
    next(err);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { taskId, status, progress } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId is required', data: null });
    }
    if (!VALID_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_TASK_STATUSES.join(', ')}`, data: null });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found', data: null });
    }

    await prisma.task.update({
      where: { id: taskId },
      data:  {
        status,
        ...(typeof progress === 'number' ? { progressPct: progress } : {}),
      },
    });

    void logAction(req.user?.id ?? null, AUDIT_ACTIONS.UPDATE_TASK, AUDIT_ENTITIES.TASK, taskId, {
      taskId,
      previousStatus: existingTask.status,
      newStatus:      status,
      ...(typeof progress === 'number' ? { progressPct: progress } : {}),
    });

    return res.status(200).json({ success: true, message: `Task status updated to ${status}`, data: null });
  } catch (err) {
    next(err);
  }
}

async function getAdminOverview(req, res, next) {
  try {
    const [totalInterns, activeTasks, openAlerts, completedLast30, allInterns, alerts] = await Promise.all([
      prisma.intern.count(),
      prisma.task.count({ where: { status: 'active' } }),
      prisma.alert.count({ where: { resolved: false } }),
      prisma.task.count({ where: { status: 'completed', lastUpdatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.intern.findMany({
        take:    10,
        include: {
          user:          { select: { email: true } },
          capacityScore: true,
          credibility:   true,
          tasks:         { where: { status: 'active' }, select: { complexity: true, progressPct: true } },
        },
      }),
      prisma.alert.findMany({
        where:   { resolved: false },
        orderBy: { createdAt: 'desc' },
        take:    10,
      }),
    ]);

    const interns = allInterns.map(i => {
      const tli = i.tasks.reduce(
        (sum, t) => sum + t.complexity * (1 - t.progressPct / 100),
        0
      );
      return {
        id:               i.id,
        name:             i.user?.email?.split('@')[0] ?? i.id,
        capacityScore:    Math.round((i.capacityScore?.finalCapacity ?? 0) * 100),
        tli:              parseFloat(tli.toFixed(2)),
        rpi:              0,
        credibilityScore: Math.round(i.credibility?.score ?? 0),
        availability:     i.capacityScore?.capacityLabel ?? 'Unknown',
        taskCount:        i.tasks.length,
      };
    });

    return res.status(200).json({
      success: true,
      data: { totalInterns, activeTasks, openAlerts, completedLast30, interns, alerts },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { overrideScore, updateTaskStatus, getAdminOverview };
