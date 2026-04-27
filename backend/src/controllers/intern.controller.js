const prisma = require('../utils/prisma');
const { computePerformanceIndex } = require('../services/performanceEngine');

async function getInternDashboard(req, res, next) {
  try {
    const internId = req.user.id;

    console.log('[INFO] Intern dashboard fetched:', internId);

    const [intern, assignedTasks] = await Promise.all([
      prisma.intern.findUnique({
        where:   { id: internId },
        include: { capacityScore: true, credibility: true, reviews: true },
      }),
      prisma.task.findMany({
        where:  { internId, status: 'active' },
        select: { id: true, title: true, status: true, complexity: true, progressPct: true },
      }),
    ]);

    if (!intern) {
      return res.status(404).json({ success: false, message: 'Intern not found' });
    }

    const { performanceIndex } = computePerformanceIndex(intern.reviews);
    const capacityScore  = intern.capacityScore?.finalCapacity ?? 0;
    const credibility    = intern.credibility?.score           ?? 0;

    return res.status(200).json({
      success: true,
      data: {
        capacityScore,
        performanceIndex,
        credibility,
        assignedTasks,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getInternDashboard };
