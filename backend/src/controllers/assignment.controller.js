const { getAssignmentShortlist } = require('../services/assignmentEngine');
const { validateTaskAssignment }  = require('../services/businessRules');
const { ok, validationError, businessError } = require('../utils/respond');
const prisma = require('../utils/prisma');
const { logAction } = require('../utils/auditLogger');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');

const MIN_CAPACITY_THRESHOLD = parseInt(process.env.MIN_CAPACITY_THRESHOLD) || 40;

async function getShortlist(req, res, next) {
  try {
    const { task } = req.body;

    if (!task || !Array.isArray(task.requiredSkills)) {
      return validationError(res, 'Missing required field: task.requiredSkills');
    }

    const dbInterns = await prisma.intern.findMany({
      include: {
        credibility: true,
        tasks:       { where: { status: 'active' } },
        // Fetch the most recent capacity score from the new pipeline
        scoreHistory: {
          where:   { type: 'capacity' },
          orderBy: { createdAt: 'desc' },
          take:    1,
        },
      },
    });

    // Map DB records to the shape assignmentEngine expects.
    // capacityScore and credibilityScore must both be 0–100 integers.
    const interns = dbInterns.map(i => {
      // Latest capacity score from ScoreHistory (integer 0–100)
      const capacityScore = i.scoreHistory[0]
        ? Math.round(i.scoreHistory[0].score)
        : 0;

      // CredibilityScore.score is a 0–1 float — convert to 0–100
      const credibilityScore = i.credibility
        ? Math.round(i.credibility.score * 100)
        : 0;

      // Task Load Index — sum of (complexity × remaining work) for active tasks
      const TLI = i.tasks.reduce(
        (sum, t) => sum + t.complexity * (1 - t.progressPct / 100),
        0
      );

      return {
        id:                 i.id,
        capacityScore,
        credibilityScore,
        TLI:                parseFloat(TLI.toFixed(2)),
        availabilityStatus: capacityScore >= 30 ? 'available' : 'unavailable',
        skillTags:          i.tasks.flatMap(t => t.skills ?? []),
      };
    });

    const rankedInterns = getAssignmentShortlist(task, interns);

    return ok(res, rankedInterns, 'Shortlist generated');
  } catch (err) {
    next(err);
  }
}

async function assignTask(req, res, next) {
  try {
    const { internId, taskId } = req.body;

    // Business-level rules: intern exists, task exists, no duplicate assignment, task not completed
    const biz = await validateTaskAssignment({ internId, taskId });
    if (!biz.ok) {
      return res.status(biz.status).json({ success: false, message: biz.message, data: null });
    }

    const { task } = biz;   // reuse the task fetched during validation

    // Capacity check — read from ScoreHistory (integer 0–100, written by new pipeline).
    // If no capacity history exists the intern has not yet submitted availability —
    // block assignment with a specific message rather than silently treating score as 0.
    const latestCapacity = await prisma.scoreHistory.findFirst({
      where:   { internId, type: 'capacity' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Intern has not submitted availability yet. Capacity score is unavailable.',
        data:    null,
      });
    }

    const capacityScore = Math.round(latestCapacity.score);

    if (capacityScore < MIN_CAPACITY_THRESHOLD) {
      console.log('[INFO] Assignment blocked (low capacity):', internId);
      return res.status(400).json({
        success: false,
        message: `Intern not eligible for assignment — capacity score ${capacityScore} is below threshold ${MIN_CAPACITY_THRESHOLD}.`,
        data:    null,
      });
    }

    await prisma.task.update({
      where: { id: taskId },
      data:  { internId },
    });

    console.log('[INFO] Task assigned:', taskId, '→', internId);

    void logAction(req.user?.id ?? null, AUDIT_ACTIONS.ASSIGN_TASK, AUDIT_ENTITIES.TASK, taskId, {
      taskId,
      internId,
      previousInternId: task.internId ?? null,
    });

    return res.status(200).json({ success: true, message: 'Task assigned successfully', data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getShortlist, assignTask };
