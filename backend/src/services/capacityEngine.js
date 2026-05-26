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

const logger = require('../utils/logger');

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
    logger.warn({ received: availabilityScore, default: DEFAULTS.availabilityScore }, 'availabilityScore invalid — using default');
  if (safe.tli !== tli)
    logger.warn({ received: tli, default: DEFAULTS.tli }, 'tli invalid — using default');
  if (safe.performanceIndex !== performanceIndex)
    logger.warn({ received: performanceIndex, default: DEFAULTS.performanceIndex }, 'performanceIndex invalid — using default');
  if (safe.credibilityScore !== credibilityScore)
    logger.warn({ received: credibilityScore, default: DEFAULTS.credibilityScore }, 'credibilityScore invalid — using default');

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

/**
 * Reservation Penalty — applied when an intern has an active soft reservation.
 *
 * When a task is assigned, `reservedUntil` is set on the Intern record for
 * RESERVATION_HOURS hours. During this window the capacity engine applies a
 * −20 penalty so the intern does not appear fully available to a second admin
 * before Plane syncs the new task.
 *
 * @param {Date|null} reservedUntil - The reservation expiry timestamp, or null
 * @returns {number} 0 (no active reservation) | 20 (active reservation)
 */
function getReservationPenalty(reservedUntil) {
  if (!reservedUntil) return 0;
  return new Date(reservedUntil) > new Date() ? 20 : 0;
}

// ── Label helper ──────────────────────────────────────────────────────────────

/**
 * Returns the human-readable capacity label for a given score.
 * Exported so any module that stores or displays a capacity score can derive
 * the label from a single authoritative source rather than duplicating the
 * threshold logic.
 *
 * @param {number|null} capacityScore - Integer 0–100, or null when no score exists
 * @returns {string}
 */
function getCapacityLabel(capacityScore) {
  if (capacityScore === null || capacityScore === undefined) return 'No data';
  if (capacityScore >= 70) return 'High availability and low workload';
  if (capacityScore >= 40) return 'Moderate availability';
  return 'High workload or low availability';
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Calculates the CapacityScore by sanitising inputs then combining the five
 * component helpers.  Always returns a finite integer in [0, 100].
 *
 * @param {Object}    params
 * @param {number}    params.availabilityScore  - Pre-computed availability score, 0–40
 * @param {number}    params.tli                - Task Load Index (raw float)
 * @param {string}    [params.weekStatusToggle] - Normalised week status: 'exam' | 'busy' | 'free' | 'normal'
 * @param {boolean}   [params.examFlag]         - Legacy boolean; used only when weekStatusToggle is absent
 * @param {number}    params.performanceIndex   - Weighted review average, 1–5 scale
 * @param {number}    params.credibilityScore   - 0–100 integer
 * @param {Date|null} [params.reservedUntil]    - Active soft reservation expiry (optional)
 * @returns {{ capacityScore: number, capacityLabel: string }}
 */
function computeAvailabilityImpact({ availabilityScore }) {
  const availability = getAvailabilityScore(availabilityScore);
  // availability impact contributes positively to capacity.
  return { availabilityScore: availability, availabilityImpact: availability };
}

function computePerformanceContribution(performanceIndex) {
  return getPerformanceModifier(performanceIndex);
}

function computeCredibilityContribution(credibilityScore) {
  return getCredibilityModifier(credibilityScore);
}


function computeBlockerPenalty({ activeBlockers = 0, escalationSeverityMultiplier = 0 }) {
  const blockers = safeNumber(activeBlockers, 0);
  const mult = safeNumber(escalationSeverityMultiplier, 0);
  return blockers * mult;
}

function computeStalePenalty({ staleTasks = 0, staleDecayFactor = 0 }) {
  const stale = safeNumber(staleTasks, 0);
  const decay = safeNumber(staleDecayFactor, 0);
  return stale * decay;
}

function computeOverloadMultiplier({ effectiveTLI = 0, overloadThreshold = 12, overloadPenaltyRate = 0.15 }) {
  const tli = safeNumber(effectiveTLI, 0);
  const threshold = safeNumber(overloadThreshold, 12);
  const rate = safeNumber(overloadPenaltyRate, 0.15);

  if (tli <= threshold) return { overloadMultiplier: 0, overloadApplied: false };

  // Amplify penalty proportionally to how far we exceed the threshold.
  const excess = tli - threshold;
  const overloadMultiplier = excess * rate;
  return { overloadMultiplier, overloadApplied: true };
}

function determineLoadBand(tli) {
  const n = safeNumber(tli, 0);
  // Enterprise: map effectiveTLI to GREEN/AMBER/RED.
  // Keep it compatible with existing UI bands (≤6 green, 6-12 amber, >12 red).
  if (n <= 6) return 'GREEN';
  if (n <= 12) return 'AMBER';
  return 'RED';
}

function computeEffectiveTLI({ rawTLI = 0, blockerPenalty = 0, stalePenalty = 0, overloadMultiplier = 0 }) {
  const raw = safeNumber(rawTLI, 0);
  const bp = safeNumber(blockerPenalty, 0);
  const sp = safeNumber(stalePenalty, 0);
  const om = safeNumber(overloadMultiplier, 0);

  // Per spec: EffectiveTLI = RawTLI + blocker penalty + stale task penalty + overload multiplier
  return raw + bp + sp + om;
}

function computeCapacityScore({
  availabilityScore,
  effectiveTLI,
  blockerImpact = 0,
  staleImpact = 0,
  overloadMultiplier = 0,
  credibilityScore,
  performanceIndex,
  performanceContribution,
  credibilityContribution,
}) {
  const availability = getAvailabilityScore(availabilityScore);

  // Convert contributions into comparable penalty/bonus space.
  // If contributions are provided, use them; otherwise derive from existing helpers.
  const credContribution =
    typeof credibilityContribution === 'number'
      ? credibilityContribution
      : getCredibilityModifier(credibilityScore);

  const perfContribution =
    typeof performanceContribution === 'number'
      ? performanceContribution
      : getPerformanceModifier(performanceIndex);

  // EffectiveTLI penalty: linear on the same scale as existing task TLI penalties.
  const effectivePenalty = safeNumber(effectiveTLI, 0);

  const raw =
    // Avoid double-penalizing blockerImpact when effectiveTLI already
    // includes it via computeEffectiveTLI(rawTLI + blockerPenalty + stalePenalty + overloadMultiplier).
    availability
    - effectivePenalty
    - safeNumber(staleImpact, 0)
    + credContribution
    + perfContribution;


  const final = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    finalCapacityScore: final,
    capacityScore: final, // backwards-compatible alias
    effectiveTLI: safeNumber(effectiveTLI, 0),
    blockerImpact: safeNumber(blockerImpact, 0),
    staleImpact: safeNumber(staleImpact, 0),
    overloadMultiplier: safeNumber(overloadMultiplier, 0),
    credibilityContribution: credContribution,
    performanceContribution: perfContribution,
    capacityLabel: getCapacityLabel(final),
  };
}

function calculateCapacityScore(params) {
  const safe = sanitizeInputs(params);

  // Backward-compatible path: existing callers provide { availabilityScore, tli, weekStatusToggle, examFlag, performanceIndex, credibilityScore, reservedUntil }.
  // We map legacy tli into rawTLI; we do not have blocker/stale inputs yet, so they default to 0.

  // ENTERPRISE formula (enterprise EffectiveTLI + impacts) with backward-compatible integration.
  // For now, blocker/stale are unknown to this legacy caller, so we derive them as 0.
  // We still preserve existing examFlag + reservationPenalty behaviour by mapping them into blockerImpact.

  const availabilityImpact = computeAvailabilityImpact({ availabilityScore: safe.availabilityScore });

  // Enterprise inputs we have in this legacy pipeline:
  const examPenalty = getExamPenalty(safe.weekStatusToggle, safe.examFlag);
  const reservationPenalty = getReservationPenalty(params?.reservedUntil ?? null);
  // Enterprise spec: blockerImpact is derived from active blockers * escalation multiplier.
  // Legacy compatibility: in the existing unit tests, the only 'blocker impact' signal
  // is modeled via examPenalty (and reservationPenalty). This keeps the examFlag
  // penalty semantics unchanged.
  const blockerImpact = examPenalty + reservationPenalty;


  // Legacy tests rely on the bucketed taskLoadPenalty behaviour (0|20|40).
  // Convert legacy `tli` into a legacy task penalty and treat that as RawTLI in the enterprise scale.
  // This ensures the existing capacityEngine integration remains consistent with current unit tests.
  // Legacy test expectations treat `tli` bucket as the raw penalty term.
  // Keep it aligned with existing capacityEngine.test.js expectations.
  const taskLoadPenalty = getTaskLoadPenalty(safe.tli);
  const rawTLI = taskLoadPenalty;



  // Overload multiplier based on EffectiveTLI exceeding threshold (spec requirement).
  const { overloadMultiplier } = computeOverloadMultiplier({ effectiveTLI: rawTLI, overloadThreshold: 12, overloadPenaltyRate: 0.15 });

  // Enterprise EffectiveTLI = RawTLI + blocker penalty + stale task penalty + overload multiplier.
  const effectiveTLI = computeEffectiveTLI({
    rawTLI,
    blockerPenalty: blockerImpact,
    stalePenalty: 0,
    overloadMultiplier,
  });


  // Contributions from existing helpers
  const perfContribution = getPerformanceModifier(safe.performanceIndex);
  const credContribution = getCredibilityModifier(safe.credibilityScore);

  // Compute final score using the enterprise structure.
  const { finalCapacityScore } = computeCapacityScore({
    availabilityScore: availabilityImpact.availabilityScore,
    effectiveTLI,
    blockerImpact,
    staleImpact: 0,
    overloadMultiplier,
    credibilityScore: safe.credibilityScore,
    performanceIndex: safe.performanceIndex,
    credibilityContribution: credContribution,
    performanceContribution: perfContribution,
  });

  return {
    capacityScore: finalCapacityScore,
    capacityLabel: getCapacityLabel(finalCapacityScore),
    // Explainability payload
    effectiveTLI,
    blockerImpact,
    staleImpact: 0,
    overloadMultiplier,
    credibilityContribution: credContribution,
    performanceContribution: perfContribution,
    finalCapacityScore,
  };
}



// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  calculateCapacityScore,
  // Enterprise explainability / recomputation helpers
  computeCapacityScore,
  computeEffectiveTLI,
  computeAvailabilityImpact,
  computeBlockerPenalty,
  computeStalePenalty,
  computeOverloadMultiplier,
  determineLoadBand,
  // Backwards-compatible exports
  getCapacityLabel,
  getAvailabilityScore,
  getTaskLoadPenalty,
  getExamPenalty,
  getPerformanceModifier,
  getCredibilityModifier,
  getReservationPenalty,
};

