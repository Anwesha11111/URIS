const { computeCredibilityScore } = require('../services/credibilityService');
const { saveScoreHistory } = require('../services/scoreHistory.service');

async function getCredibility(req, res) {
  const { internId } = req.query;

  if (!internId) {
    return res.status(400).json({ success: false, message: 'internId is required.', data: null });
  }

  try {
    const result = await computeCredibilityScore(internId);
    await saveScoreHistory(internId, result.score, 'credibility');
    res.json({ success: true, message: 'Credibility score computed.', data: result });
  } catch (err) {
    console.error('[credibilityController] getCredibility error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to compute credibility score.', data: null });
  }
}

async function getMyCredibility(req, res, next) {
  try {
    const internId = req.user.id;

    console.log('[INFO] Credibility fetched for:', internId);

    const result = await computeCredibilityScore(internId);
    await saveScoreHistory(internId, result.score, 'credibility');

    // Derive human-readable factors from signals
    const factors = [];
    if (result.signals.updateFrequency < 0.5)   factors.push('late updates');
    if (result.signals.deadlineAdherence < 0.5)  factors.push('missed deadlines');
    if (result.signals.throughputAccuracy < 0.5) factors.push('low task throughput');

    return res.status(200).json({
      success: true,
      data: {
        score:   result.scoreOut100,
        factors: factors.length ? factors : ['no issues detected'],
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCredibility, getMyCredibility };
