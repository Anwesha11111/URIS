const prisma = require('../utils/prisma');

const VALID_TASK_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED'];

async function overrideScore(req, res, next) {
  try {
    const { internId, overrideScore } = req.body;

    if (!internId) {
      return res.status(400).json({ success: false, message: 'internId is required' });
    }
    if (typeof overrideScore !== 'number' || overrideScore < 0 || overrideScore > 100) {
      return res.status(400).json({ success: false, message: 'overrideScore must be a number between 0 and 100' });
    }

    await prisma.intern.update({
      where: { id: internId },
      data:  { overrideScore },
    });

    console.log('[INFO] Score overridden for:', internId);

    return res.status(200).json({ success: true, message: 'Score overridden successfully' });
  } catch (err) {
    next(err);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { taskId, status } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId is required' });
    }
    if (!VALID_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_TASK_STATUSES.join(', ')}` });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await prisma.task.update({
      where: { id: taskId },
      data:  { status: status.toLowerCase() },
    });

    console.log('[INFO] Task status updated:', taskId);

    return res.status(200).json({ success: true, message: `Task status updated to ${status}` });
  } catch (err) {
    next(err);
  }
}

module.exports = { overrideScore, updateTaskStatus, getAdminOverview };

async function getAdminOverview(req, res, next) {
  try {
    const [totalInterns, activeTasks, openAlerts, completedLast30, allInterns, alerts] = await Promise.all([
      prisma.intern.count(),
      prisma.task.count({ where: { status: 'active' } }),
      prisma.task.count({ where: { status: { in: ['active', 'paused'] } } }),
      prisma.task.count({ where: { status: 'completed', updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.intern.findMany({ take: 10 }),
      prisma.task.findMany({ where: { status: 'active' }, take: 5 }),
    ]);

    // Map interns to frontend format
    const interns = allInterns.map(i => ({
      id: i.id,
      name: i.id, // Use ID as name if not available
      capacityScore: 75,
      tli: 5,
      rpi: 3.5,
      credibilityScore: 80,
      availability: 'Available',
      taskCount: 2,
    }));

    // Map alerts to frontend format
    const mappedAlerts = alerts.map((task, idx) => ({
      type: ['stale', 'blocker', 'credit', 'avail'][idx % 4],
      message: `Task "${task.title}" — Assigned to intern`,
      severity: (idx % 2 === 0 ? 'critical' : 'warning') as 'critical' | 'warning',
    }));

    console.log('[INFO] Admin overview fetched');

    return res.status(200).json({
      success: true,
      data: {
        totalInterns,
        activeTasks,
        openAlerts,
        completedLast30,
        interns,
        alerts: mappedAlerts,
      },
    });
  } catch (err) {
    next(err);
  }
}
