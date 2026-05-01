const { computeCredibilityScore } = require('../services/credibilityService');
const { saveScoreHistory } = require('../services/scoreHistory.service');
const { ok, validationError, notFound } = require('../utils/respond');
const prisma = require('../utils/prisma');

async function getCredibility(req, res) {
  const { internId } = req.query;

  if (!internId) {
    return validationError(res, 'internId is required');
  }

  try {
    const result = await computeCredibilityScore(internId);
    await saveScoreHistory(internId, result.score, 'credibility');
    return ok(res, result, 'Credibility score computed.');
  } catch (err) {
    console.error('[credibilityController] getCredibility error:', err.message);
    return res.status(500).json({
      success: false,
      error:   'SERVER_ERROR',
      message: 'Failed to compute credibility score.',
      data:    null,
    });
  }
}

async function getMyCredibility(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return notFound(res, 'Intern not found');
    }
    const internId = intern.id;

    console.log('[INFO] Credibility fetched for:', internId);

    const result = await computeCredibilityScore(internId);
    await saveScoreHistory(internId, result.score, 'credibility');

    const factors = [];
    if (result.signals.updateFrequency < 0.5)   factors.push('late updates');
    if (result.signals.deadlineAdherence < 0.5)  factors.push('missed deadlines');
    if (result.signals.throughputAccuracy < 0.5) factors.push('low task throughput');

    return ok(res, {
      score:   result.scoreOut100,
      factors: factors.length ? factors : ['no issues detected'],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCredibility, getMyCredibility };
