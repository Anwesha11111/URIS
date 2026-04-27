const prisma = require('../utils/prisma');
const { computePerformanceIndex } = require('../services/performanceEngine');
const { uploadToNextcloud } = require('../services/storage.service');
const { saveScoreHistory } = require('../services/scoreHistory.service');

async function getPerformance(req, res, next) {
  try {
    const { internId } = req.params;

    const reviews = await prisma.review.findMany({ where: { internId } });
    const { performanceIndex: computedIndex, totalReviews: reviewCount } = computePerformanceIndex(reviews);

    // Respect admin override if set
    const intern = await prisma.intern.findUnique({ where: { id: internId }, select: { overrideScore: true } });
    
    let performanceIndex;
    let isOverridden = false;
    let source;
    
    if (intern?.overrideScore !== null && intern?.overrideScore !== undefined) {
      performanceIndex = intern.overrideScore;
      isOverridden = true;
      source = 'override';
    } else {
      performanceIndex = computedIndex;
      source = 'computed';
    }

    try {
      await uploadToNextcloud(`performance_${internId}_${Date.now()}.json`, {
        internId,
        performanceIndex,
        reviewCount,
        isOverridden,
        source,
        timestamp: new Date(),
      });
      console.log('Nextcloud sync success: performance');
    } catch (uploadErr) {
      console.error('Nextcloud sync failed:', uploadErr.message);
    }

    await saveScoreHistory(internId, performanceIndex, 'performance');

    return res.status(200).json({ 
      success: true, 
      message: 'Performance retrieved', 
      data: { performanceIndex, reviewCount, isOverridden, source } 
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPerformance };
