const { computeAndPersistCredibility } = require('./credibilityEngine');

// Keep exported API contract stable for controllers and frontend.
// Controllers expect computeCredibilityScore(internId[, baseCapacity]) -> { scoreOut100, signals, ... }
async function computeCredibilityScore(internId, _baseCapacity = 0.5) {
  const computed = await computeAndPersistCredibility(internId);

  return {
    internId,
    // Legacy signals (0..1) used by controller factors
    signals: {
      updateFrequency: computed.legacySignals?.updateFrequency ?? computed.signals?.updateConsistency,
      deadlineAdherence: computed.legacySignals?.deadlineAdherence ?? computed.signals?.deadlineReliability,
      throughputAccuracy: computed.legacySignals?.throughputAccuracy ?? computed.signals?.throughputStability,
    },

    // Keep old numeric meaning: score is persisted 0..1, but controller/score history uses integer 0..100.
    score: computed.scoreOut100 / 100,
    scoreOut100: computed.scoreOut100,
    flag: computed.scoreOut100 < 50 ? 'low_credibility' : null,

    // Provide explainability for future UI/diagnostics (controllers ignore extra fields).
    explainability: computed.explainability,
    detectRiskPatterns: computed.detectRiskPatterns,
  };
}

module.exports = { computeCredibilityScore };

