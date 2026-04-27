const { computeAvailabilityIntelligence } = require('./availabilityIntelligence');
const { computeTaskLoadIndex } = require('./taskLoadIndex');
const { calculateCapacityScore } = require('./capacityEngine');
const { computePerformanceIndex } = require('./performanceEngine');
const prisma = require('../utils/prisma');

const DEFAULT_PERFORMANCE_INDEX = 3; // neutral fallback when no reviews exist

/**
 * Main pipeline for computing an intern's capacity.
 *
 * @param {Object} params
 * @param {Array}   params.busyBlocks        - [{ day, reason_code, severity }]
 * @param {number}  params.maxFreeBlockHours - 1 | 2 | 3
 * @param {string}  params.weekStatusToggle  - "generally_free" | "heavy_week"
 * @param {Array}   params.tasks             - [{ task_complexity, progress_pct }]
 * @param {boolean} params.examFlag          - Whether exam period is active
 * @param {string}  [params.internId]        - If provided, performanceIndex is fetched from DB
 * @param {number}  [params.performanceIndex] - Manual override (used when internId is absent)
 * @param {number}  params.credibilityScore  - 0 to 100
 * @returns {Promise<{ availability: Object, TLI: number, capacityScore: number, capacityLabel: string, performanceIndex: number }>}
 */
async function processInternCapacity({
  busyBlocks,
  maxFreeBlockHours,
  weekStatusToggle,
  tasks,
  examFlag,
  internId,
  performanceIndex,
  credibilityScore,
}) {
  try {
    const busyBlocksList = busyBlocks || [];
    const tasksList = tasks || [];

    // Fetch performanceIndex from DB if internId is provided
    let resolvedPerformanceIndex = performanceIndex ?? DEFAULT_PERFORMANCE_INDEX;
    if (internId) {
      const reviews = await prisma.review.findMany({ where: { internId } });
      const { performanceIndex: computed } = computePerformanceIndex(reviews);
      resolvedPerformanceIndex = computed || DEFAULT_PERFORMANCE_INDEX;
    }

    const availability = computeAvailabilityIntelligence(busyBlocksList, maxFreeBlockHours, weekStatusToggle);
    const TLI = computeTaskLoadIndex(tasksList);
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: availability.availabilityScore,
      tli: TLI,
      examFlag,
      performanceIndex: resolvedPerformanceIndex,
      credibilityScore,
    });

    console.log('[INFO] Capacity score computed:', capacityScore);

    return { availability, TLI, capacityScore, capacityLabel, performanceIndex: resolvedPerformanceIndex };
  } catch (err) {
    throw new Error(`processInternCapacity failed: ${err.message}`);
  }
}

module.exports = { processInternCapacity };
