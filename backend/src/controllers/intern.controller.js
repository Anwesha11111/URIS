const prisma = require('../utils/prisma');
const { computePerformanceIndex } = require('../services/performanceEngine');

async function getInternDashboard(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({
      where:   { userId: req.user.id },
      include: { capacityScore: true, credibility: true, reviews: true },
    });

    if (!intern) {
      return res.status(404).json({ success: false, message: 'Intern not found' });
    }

    const internId = intern.id;

    console.log('[INFO] Intern dashboard fetched:', internId);

    const assignedTasks = await prisma.task.findMany({
      where:  { internId, status: 'active' },
      select: { id: true, title: true, status: true, complexity: true, progressPct: true },
    });

    const { performanceIndex } = computePerformanceIndex(intern.reviews);
    const capacityScore  = Math.round((intern.capacityScore?.finalCapacity ?? 0) * 100);
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
