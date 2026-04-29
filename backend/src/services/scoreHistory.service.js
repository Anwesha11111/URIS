const prisma = require('../utils/prisma');
const { detectAnomaly } = require('./anomalyDetector');

/**
 * Persist a score snapshot to history, then run anomaly detection.
 * Both operations are fire-and-forget — never break the main request flow.
 *
 * @param {string} internId
 * @param {number} score
 * @param {'performance'|'credibility'|'capacity'} type
 */
async function saveScoreHistory(internId, score, type) {
  try {
    await prisma.scoreHistory.create({ data: { internId, score, type } });
    console.log('[INFO] Score history recorded:', type);

    // Run anomaly detection after saving — fire-and-forget
    void detectAnomaly(internId, score, type);
  } catch (err) {
    console.error('[scoreHistory] Failed to save score history:', err.message);
  }
}

module.exports = { saveScoreHistory };
