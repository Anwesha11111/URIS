const { computeAvailabilityIntelligence } = require('./availabilityIntelligence');
const { computeTaskLoadIndex } = require('./taskLoadIndex');
const { calculateCapacityScore } = require('./capacityEngine');
const { computePerformanceIndex } = require('./performanceEngine');
const { computeCredibilityScore } = require('./credibilityService');
const prisma = require('../utils/prisma');

const DEFAULT_PERFORMANCE_INDEX  = 3;  // neutral fallback when no reviews exist
const DEFAULT_CREDIBILITY_SCORE  = 50; // neutral fallback (0–100) when credibility unavailable

/**
 * Main pipeline for computing an intern's capacity.
 *
 * @param {Object} params
 * @param {Array}   params.busyBlocks        - [{ day, reason_code, severity }]
 * @param {number}  params.maxFreeBlockHours - 1 | 2 | 3
 * @param {string}  params.weekStatusToggle  - 'exam' | 'busy' | 'free' | 'normal'
 * @param {Array}   params.tasks             - [{ task_complexity, progress_pct }]
 * @param {boolean} params.examFlag          - Legacy boolean exam flag
 * @param {string}  [params.internId]        - If provided, performance and credibility are fetched from DB
 * @param {number}  [params.performanceIndex] - Manual override (used when internId is absent)
 * @param {number}  [params.credibilityScore] - Manual override 0–100 (used when internId is absent)
 * @returns {Promise<{ availability, TLI, capacityScore, capacityLabel, performanceIndex, credibilityScore }>}
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
    const tasksList      = tasks      || [];

    // ── Performance index ────────────────────────────────────────────────────
    // Fetch from DB when internId is available; use caller-supplied value or
    // neutral default otherwise.
    let resolvedPerformanceIndex = performanceIndex ?? DEFAULT_PERFORMANCE_INDEX;
    if (internId) {
      const reviews = await prisma.review.findMany({ where: { internId } });
      const { performanceIndex: computed } = computePerformanceIndex(reviews);
      resolvedPerformanceIndex = computed || DEFAULT_PERFORMANCE_INDEX;
    }

    // ── Credibility score (0–100) ────────────────────────────────────────────
    // Fetch live credibility when internId is available.
    // credibilityService returns a 0–1 float; scoreOut100 is the 0–100 integer
    // the capacity engine expects.
    // Fall back to caller-supplied value (if any) or neutral default on error.
    let resolvedCredibilityScore = credibilityScore ?? DEFAULT_CREDIBILITY_SCORE;
    if (internId) {
      try {
        const credResult = await computeCredibilityScore(internId);
        resolvedCredibilityScore = credResult.scoreOut100; // 0–100 integer
      } catch (credErr) {
        console.warn('[processInternCapacity] Credibility fetch failed — using fallback:', credErr.message);
        // Keep resolvedCredibilityScore as the caller-supplied value or default
      }
    }

    const availability = computeAvailabilityIntelligence(busyBlocksList, maxFreeBlockHours, weekStatusToggle);
    const TLI = computeTaskLoadIndex(tasksList);
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: availability.availabilityScore,
      tli: TLI,
      weekStatusToggle,   // preferred: drives exam/heavy-load penalty
      examFlag,           // legacy fallback when weekStatusToggle is absent
      performanceIndex: resolvedPerformanceIndex,
      credibilityScore: resolvedCredibilityScore,
    });

    console.log('[INFO] Capacity score computed:', capacityScore);

    return {
      availability,
      TLI,
      capacityScore,
      capacityLabel,
      performanceIndex : resolvedPerformanceIndex,
      credibilityScore : resolvedCredibilityScore,
    };
  } catch (err) {
    throw new Error(`processInternCapacity failed: ${err.message}`);
  }
}

module.exports = { processInternCapacity };
