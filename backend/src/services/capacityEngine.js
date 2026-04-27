/**
 * Calculates the CapacityScore based on the URIS design.
 *
 * @param {Object} params
 * @param {number} params.availabilityScore - 0 to 40
 * @param {number} params.tli - Task Load Index
 * @param {boolean} params.examFlag - Whether exam period is active
 * @param {number} params.performanceIndex - 1 to 5
 * @param {number} params.credibilityScore - 0 to 100
 * @returns {{ capacityScore: number, capacityLabel: string }}
 */
function calculateCapacityScore({ availabilityScore, tli, examFlag, performanceIndex, credibilityScore }) {
  // 1. Task Load Penalty
  let taskLoadPenalty = 0;
  if (tli <= 6) taskLoadPenalty = 0;
  else if (tli <= 12) taskLoadPenalty = 20;
  else taskLoadPenalty = 40;

  // 2. Exam Penalty
  const examPenalty = examFlag ? 30 : 0;

  // 3. Performance Modifier
  let performanceModifier = 0;
  if (performanceIndex > 4) performanceModifier = 15;
  else if (performanceIndex >= 3) performanceModifier = 0;
  else if (performanceIndex >= 2) performanceModifier = -10;
  else performanceModifier = -15;

  // 4. Credibility Modifier
  let credibilityModifier = 0;
  if (credibilityScore > 75) credibilityModifier = 10;
  else if (credibilityScore >= 50) credibilityModifier = 0;
  else if (credibilityScore >= 35) credibilityModifier = -6;
  else credibilityModifier = -10;

  // Final calculation
  const raw = availabilityScore - taskLoadPenalty - examPenalty + performanceModifier + credibilityModifier;

  // Clamp between 0 and 100
  const capacityScore = Math.min(100, Math.max(0, raw));

  let capacityLabel;
  if (capacityScore >= 70) capacityLabel = 'High availability and low workload';
  else if (capacityScore >= 40) capacityLabel = 'Moderate availability';
  else capacityLabel = 'High workload or low availability';

  return { capacityScore, capacityLabel };
}

module.exports = { calculateCapacityScore };
