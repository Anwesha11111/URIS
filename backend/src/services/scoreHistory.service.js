const prisma = require('../utils/prisma');

/**
 * Persist a score snapshot to history. Fails silently — never breaks the main flow.
 *
 * @param {string} internId
 * @param {number} score
 * @param {'performance'|'credibility'|'capacity'} type
 */
async function saveScoreHistory(internId, score, type) {
  try {
    await prisma.scoreHistory.create({ data: { internId, score, type } });
    console.log('[INFO] Score history recorded:', type);
  } catch (err) {
    console.error('[scoreHistory] Failed to save score history:', err.message);
  }
}

module.exports = { saveScoreHistory };
