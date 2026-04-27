const prisma = require('../utils/prisma');

async function generateBlockerAlerts() {
  const blockedTasks = await prisma.task.findMany({
    where: { hasBlocker: true, status: { not: 'completed' } }
  });

  let created = 0;

  for (const task of blockedTasks) {
    const hoursBlocked = (Date.now() - new Date(task.lastUpdatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursBlocked < 48) continue;

    const existing = await prisma.alert.findFirst({
      where: { taskId: task.id, type: 'blocker_escalation', resolved: false }
    });
    if (existing) continue;

    const isEscalated = hoursBlocked >= 96;
    const message = isEscalated
      ? `ESCALATED: Task "${task.title}" has been blocked for ${Math.round(hoursBlocked)} hours. Lead attention required.`
      : `Task "${task.title}" has been blocked for ${Math.round(hoursBlocked)} hours. Blocking party notified.`;

    await prisma.alert.create({
      data: { internId: task.internId, type: 'blocker_escalation', taskId: task.id, message }
    });
    created++;
  }

  return created;
}

async function generateReassignmentAlerts(internId, finalCapacity) {
  if (finalCapacity >= 0.2) return;

  const existing = await prisma.alert.findFirst({
    where: { internId, type: 'reassignment', resolved: false }
  });
  if (existing) return;

  await prisma.alert.create({
    data: {
      internId,
      type: 'reassignment',
      message: `Intern ${internId} has a final capacity score of ${Math.round(finalCapacity * 100)}. Consider reassigning active tasks.`
    }
  });
}

async function getAllActiveAlerts() {
  return prisma.alert.findMany({
    where: { resolved: false },
    orderBy: { createdAt: 'desc' }
  });
}

async function resolveAlert(alertId) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { resolved: true }
  });
}

module.exports = { generateBlockerAlerts, generateReassignmentAlerts, getAllActiveAlerts, resolveAlert };
