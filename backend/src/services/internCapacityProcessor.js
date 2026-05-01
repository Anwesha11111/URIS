const { computeAvailabilityIntelligence } = require('./availabilityIntelligence');
const { computeTaskLoadIndex } = require('./taskLoadIndex');
const { calculateCapacityScore } = require('./capacityEngine');

/**
 * @deprecated Use processInternCapacity from './processInternCapacity' instead.
 * This synchronous version is kept for reference only and should not be used in new code.
 */
function processInternCapacity({
  busyBlocks,
  maxFreeBlockHours,
  weekStatusToggle,
  tasks,
  examFlag,
  performanceIndex,
  credibilityScore,
}) {
  const busyBlocksList = busyBlocks || [];
  const tasksList = tasks || [];

  const availability = computeAvailabilityIntelligence(busyBlocksList, maxFreeBlockHours, weekStatusToggle);
  const TLI = computeTaskLoadIndex(tasksList);
  const { capacityScore, capacityLabel } = calculateCapacityScore({
    availabilityScore: availability.availabilityScore,
    tli: TLI,
    weekStatusToggle,   // preferred: drives exam/heavy-load penalty
    examFlag,           // legacy fallback when weekStatusToggle is absent
    performanceIndex,
    credibilityScore,
  });

  return { availability, TLI, capacityScore, capacityLabel };
}

module.exports = { processInternCapacity };
