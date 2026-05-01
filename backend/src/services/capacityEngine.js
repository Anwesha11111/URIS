/**
 * capacityEngine.js
 *
 * Calculates the CapacityScore per the URIS design specification.
 *
 * Formula:
 *   CapacityScore = availabilityScore   (0–40)
 *                 − taskLoadPenalty     (0 | 20 | 40)
 *                 − examPenalty         (0 | 15 | 30)
 *                 + performanceModifier (−15 | −10 | 0 | +15)
 *                 + credibilityModifier (−10 | −6  | 0 | +10)
 *
 * Result is clamped to [0, 100] and returned as an integer.
 *
 * Each component is implemented as a standalone exported helper so it can be
 * unit-tested in isolation without invoking the full pipeline.
 */

'use strict';

// ── Defaults ──────────────────────────────────────────────────────────────────

/**
 * Neutral fallback values applied when a caller omits or passes a non-finite
 * value for a numeric input.  Chosen to produce a mid-range, non-penalising
 * score so a missing signal never silently tanks an intern's capacity.
 *
 * availability → 0   (unknown availability = no score contribution)
 * tli          → 0   (no tasks on record = no load penalty)
 * performance  → 3.0 (neutral mid-point of the 1–5 RPI scale)
 * credibility  → 50  (neutral mid-point of the 0–100 scale)
 */
const DEFAULTS = {
  availabilityScore: 0,
  tli              : 0,
  performanceIndex : 3.0,
  credibilityScore : 50,
};

// ── Internal utility ──────────────────────────────────────────────────────────

/**
 * Returns `value` if it is a finite number, otherwise returns `fallback`.
 * Catches null, undefined, NaN, Infinity, and non-numeric types in one check.
 *
 * @param {*}      value
 * @param {number} fallback
 * @returns {number}
 */
function safeNumber(value, fallback) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
}

// ── Input sanitiser ───────────────────────────────────────────────────────────

/**
 * Validates and normalises all numeric inputs before they reach the helpers.
 * Any missing or non-finite value is replaced with its documented default.
 * Logs a warning for each substitution so silent data issues are visible.
 *
 * @param {Object} params - Raw params passed to calculateCapacityScore
 * @returns {Object}      - Sanitised params safe to pass to helpers
 */
function sanitizeInputs(params) {
  const {
    availabilityScore,
    tli,
    weekStatusToggle,
    examFlag,
    performanceIndex,
    credibilityScore,
  } = params ?? {};

  const safe = {
    availabilityScore: safeNumber(availabilityScore, DEFAULTS.availabilityScore),
    tli              : safeNumber(tli,               DEFAULTS.tli),
    weekStatusToggle : typeof weekStatusToggle === 'string' ? weekStatusToggle : null,
    examFlag         : Boolean(examFlag),
    performanceIndex : safeNumber(performanceIndex,  DEFAULTS.performanceIndex),
    credibilityScore : safeNumber(credibilityScore,  DEFAULTS.credibilityScore),
  };

  // Warn on each substitution so data issues are visible in logs
  if (safe.availabilityScore !== availabilityScore)
    console.warn(`[capacityEngine] availabilityScore was ${availabilityScore} — using default ${DEFAULTS.availabilityScore}`);
  if (safe.tli !== tli)
    console.warn(`[capacityEngine] tli was ${tli} — using default ${DEFAULTS.tli}`);
  if (safe.performanceIndex !== performanceIndex)
    console.warn(`[capacityEngine] performanceIndex was ${performanceIndex} — using default ${DEFAULTS.performanceIndex}`);
  if (safe.credibilityScore !== credibilityScore)
    console.warn(`[capacityEngine] credibilityScore was ${credibilityScore} — using default ${DEFAULTS.credibilityScore}`);

  return safe;
}

// ── Component helpers ─────────────────────────────────────────────────────────

/**
 * Availability score is pre-computed by availabilityIntelligence.js (0–40).
 * Clamps the value to [0, 40] and guards against NaN.
 *
 * @param {number} availabilityScore - Pre-computed score, 0–40
 * @returns {number} Safe integer in [0, 40]
 */
function getAvailabilityScore(availabilityScore) {
  const n = safeNumber(availabilityScore, DEFAULTS.availabilityScore);
  return Math.min(40, Math.max(0, n));
}

/**
 * Task Load Penalty based on the intern's effective Task Load Index (TLI).
 *
 * Band   TLI range   Penalty
 * Green  ≤ 6         0   (low workload, no penalty)
 * Amber  7–12        20  (moderate workload)
 * Red    > 12        40  (high workload, full penalty)
 *
 * @param {number} tli - Task Load Index (raw float, ≥ 0)
 * @returns {number} 0 | 20 | 40
 */
function getTaskLoadPenalty(tli) {
  const n = safeNumber(tli, DEFAULTS.tli);
  if (n <= 6)  return 0;
  if (n <= 12) return 20;
  return 40;
}

/**
 * Exam / Heavy-Load Penalty.
 *
 * Prefers the normalised `weekStatusToggle` string over the legacy boolean
 * `examFlag` so that the heavy-load tier (−15) is correctly applied.
 *
 * weekStatusToggle  Penalty
 * 'exam'            30  (exam week — full penalty)
 * 'busy'            15  (heavy-load week — partial penalty)
 * anything else      0  (normal week)
 *
 * Legacy path (weekStatusToggle absent):
 *   examFlag true  → 30
 *   examFlag false →  0
 *
 * @param {string}  [weekStatusToggle] - Normalised week status: 'exam' | 'busy' | 'free' | 'normal'
 * @param {boolean} [examFlag]         - Legacy boolean fallback
 * @returns {number} 0 | 15 | 30
 */
function getExamPenalty(weekStatusToggle, examFlag) {
  if (typeof weekStatusToggle === 'string' && weekStatusToggle.length > 0) {
    if (weekStatusToggle === 'exam')  return 30;
    if (weekStatusToggle === 'busy')  return 15;
    return 0;
  }
  // Legacy boolean path
  return examFlag ? 30 : 0;
}

/**
 * Performance Modifier based on the intern's Review Performance Index (RPI).
 *
 * RPI range   Modifier
 * > 4.0       +15  (strong performer)
 * 3.0–4.0       0  (meets expectations)
 * 2.0–3.0     −10  (underperforming)
 * < 2.0       −15  (poor performer)
 *
 * @param {number} performanceIndex - Weighted review average on a 1–5 scale
 * @returns {number} −15 | −10 | 0 | 15
 */
function getPerformanceModifier(performanceIndex) {
  const n = safeNumber(performanceIndex, DEFAULTS.performanceIndex);
  if (n > 4.0)  return 15;
  if (n >= 3.0) return 0;
  if (n >= 2.0) return -10;
  return -15;
}

/**
 * Credibility Modifier based on the intern's credibility score (0–100).
 *
 * Score range   Modifier
 * > 75          +10  (high credibility)
 * 50–75           0  (acceptable)
 * 35–50          −6  (low credibility)
 * < 35          −10  (very low credibility)
 *
 * @param {number} credibilityScore - Integer in range 0–100
 * @returns {number} −10 | −6 | 0 | 10
 */
function getCredibilityModifier(credibilityScore) {
  const n = safeNumber(credibilityScore, DEFAULTS.credibilityScore);
  if (n > 75)  return 10;
  if (n >= 50) return 0;
  if (n >= 35) return -6;
  return -10;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Calculates the CapacityScore by sanitising inputs then combining the five
 * component helpers.  Always returns a finite integer in [0, 100].
 *
 * @param {Object}  params
 * @param {number}  params.availabilityScore  - Pre-computed availability score, 0–40
 * @param {number}  params.tli                - Task Load Index (raw float)
 * @param {string}  [params.weekStatusToggle] - Normalised week status: 'exam' | 'busy' | 'free' | 'normal'
 * @param {boolean} [params.examFlag]         - Legacy boolean; used only when weekStatusToggle is absent
 * @param {number}  params.performanceIndex   - Weighted review average, 1–5 scale
 * @param {number}  params.credibilityScore   - 0–100 integer
 * @returns {{ capacityScore: number, capacityLabel: string }}
 */
function calculateCapacityScore(params) {
  // Sanitise all inputs — replace missing/NaN values with safe defaults
  const safe = sanitizeInputs(params);

  const availability = getAvailabilityScore(safe.availabilityScore);
  const taskPenalty  = getTaskLoadPenalty(safe.tli);
  const examPenalty  = getExamPenalty(safe.weekStatusToggle, safe.examFlag);
  const perfModifier = getPerformanceModifier(safe.performanceIndex);
  const credModifier = getCredibilityModifier(safe.credibilityScore);

  const raw = availability - taskPenalty - examPenalty + perfModifier + credModifier;

  // Final NaN guard — should never trigger after sanitisation, but belt-and-braces
  const safeRaw = Number.isFinite(raw) ? raw : 0;

  // Clamp to [0, 100] and return as integer
  const capacityScore = Math.round(Math.min(100, Math.max(0, safeRaw)));

  // Human-readable label
  let capacityLabel;
  if (capacityScore >= 70)      capacityLabel = 'High availability and low workload';
  else if (capacityScore >= 40) capacityLabel = 'Moderate availability';
  else                          capacityLabel = 'High workload or low availability';

  return { capacityScore, capacityLabel };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Main entry point (used by processInternCapacity)
  calculateCapacityScore,
  // Individual helpers (exported for unit testing)
  getAvailabilityScore,
  getTaskLoadPenalty,
  getExamPenalty,
  getPerformanceModifier,
  getCredibilityModifier,
};
