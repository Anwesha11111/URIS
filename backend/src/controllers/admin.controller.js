const prisma = require('../utils/prisma');
const { logAction } = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');
const { validateUpdateTaskStatus, isUUID } = require('../utils/validate');
const { ok, validationError, notFound } = require('../utils/respond');

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
      return validationError(res, 'internId is required');
    }
    if (!isUUID(internId)) {
      return validationError(res, 'internId must be a valid UUID');
    }
    if (typeof overrideScore !== 'number' || overrideScore < 0 || overrideScore > 100) {
      return validationError(res, 'overrideScore must be a number between 0 and 100');
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

    return ok(res, null, 'Score overridden successfully');
  } catch (err) {
    next(err);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { taskId, status, progress } = req.body;

    const errors = validateUpdateTaskStatus({ taskId, status, progress });
    if (errors.length > 0) {
      return validationError(res, errors[0]);
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return notFound(res, 'Task not found');
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

    return ok(res, null, `Task status updated to ${status}`);
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
          user:        { select: { email: true } },
          credibility: true,
          reviews:     { select: { quality: true, timeliness: true, initiative: true } },
          tasks: {
            select: { status: true, complexity: true, progressPct: true },
          },
          // Fetch the most recent capacity score written by the new pipeline
          scoreHistory: {
            where:   { type: 'capacity' },
            orderBy: { createdAt: 'desc' },
            take:    1,
          },
        },
      }),
      prisma.alert.findMany({
        where:   { resolved: false },
        orderBy: { createdAt: 'desc' },
        take:    10,
      }),
    ]);

    const interns = allInterns.map(i => {
      const activeTasksList = i.tasks.filter(t => t.status === 'active');
      const completedTasks  = i.tasks.filter(t => t.status === 'completed');
      const totalTasks      = i.tasks.length;

      // Task Load Index — sum of (complexity × remaining work) for active tasks
      const tli = activeTasksList.reduce(
        (sum, t) => sum + t.complexity * (1 - t.progressPct / 100),
        0
      );

      // Review Performance Index — average of (quality + timeliness + initiative) / 3
      // Scaled to 0–100 from a 0–5 rating scale
      const rpi = i.reviews.length > 0
        ? parseFloat(
            (
              i.reviews.reduce((sum, r) => sum + (r.quality + r.timeliness + r.initiative) / 3, 0)
              / i.reviews.length
              * 20  // convert 0–5 → 0–100
            ).toFixed(1)
          )
        : 0;

      // Task completion percentage
      const completionPct = totalTasks > 0
        ? Math.round((completedTasks.length / totalTasks) * 100)
        : 0;

      // Capacity score — read from ScoreHistory (integer 0–100) written by the
      // new capacityEngine pipeline via saveScoreHistory.
      // Falls back to 0 if no capacity score has been computed yet.
      const latestCapacity = i.scoreHistory[0];
      const capacityScore  = latestCapacity ? Math.round(latestCapacity.score) : 0;

      // Credibility score — CredibilityScore.score is a 0–1 float; multiply by
      // 100 to get the 0–100 integer the frontend expects.
      const credibilityScore = i.credibility
        ? Math.round(i.credibility.score * 100)
        : 0;

      return {
        id:            i.id,
        name:          i.user?.email?.split('@')[0] ?? i.id,
        capacityScore,
        tli:           parseFloat(tli.toFixed(2)),
        rpi,
        credibilityScore,
        availability:  latestCapacity ? null : 'Unknown', // label not stored in ScoreHistory
        taskCount:     totalTasks,
        activeTasks:   activeTasksList.length,
        completedTasks: completedTasks.length,
        completionPct,
      };
    });

    return ok(res, { totalInterns, activeTasks, openAlerts, completedLast30, interns, alerts });
  } catch (err) {
    next(err);
  }
}

module.exports = { overrideScore, updateTaskStatus, getAdminOverview };
