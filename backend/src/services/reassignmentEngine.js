'use strict';

// reassignmentEngine.js
// Enterprise reassignment intelligence engine (recommendation-only).
//
// Design goals:
// - no auto-transfer
// - explainable output
// - uses existing signals already in-memory / fetched by analyticsService
// - does not require new DB tables

const { determineLoadBand } = require('./capacityEngine');

const clamp01to100 = (n) => {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, x));
};

const safeNum = (n, fallback = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);

/**
 * Normalize a value into 0..100 using min/max.
 */
function normalizeTo100(value, min, max) {
  const v = safeNum(value, min);
  if (max === min) return v >= max ? 100 : 0;
  const t = (v - min) / (max - min);
  return clamp01to100(t * 100);
}

/**
 * RiskScore = staleRisk + blockerRisk + overloadRisk + deadlineRisk + lowCredibilityRisk
 * Each term is normalized into 0..100 then summed and clamped to 0..100.
 */
function computeRiskScore({
  staleRisk,
  blockerRisk,
  overloadRisk,
  deadlineRisk,
  lowCredibilityRisk,
}) {
  const sum =
    safeNum(staleRisk) +
    safeNum(blockerRisk) +
    safeNum(overloadRisk) +
    safeNum(deadlineRisk) +
    safeNum(lowCredibilityRisk);
  // Keep final in 0..100
  return clamp01to100(sum);
}

/**
 * OverloadRisk = EffectiveTLI × overload amplification factor
 */
function computeOverloadRisk({ effectiveTLI, overloadAmplificationFactor = 5 / 12 }) {
  const tli = safeNum(effectiveTLI, 0);
  return clamp01to100(tli * overloadAmplificationFactor);
}

/**
 * SuitabilityScore = availabilityScore + credibilityScore + performanceScore
 *                    - EffectiveTLI - blocker penalties - stale penalties
 */
function computeSuitabilityScore({
  availabilityScore,
  credibilityScore,
  performanceScore,
  effectiveTLI,
  blockerPenalty = 0,
  stalePenalty = 0,
}) {
  const raw =
    safeNum(availabilityScore) +
    safeNum(credibilityScore) +
    safeNum(performanceScore) -
    safeNum(effectiveTLI) -
    safeNum(blockerPenalty) -
    safeNum(stalePenalty);
  return clamp01to100(raw);
}

/**
 * Detect reassignment risk triggers for an owner assignment context.
 * Output includes an explainable trigger list + component risks.
 */
function detectReassignmentRisk({
  capacityScore,
  effectiveTli,
  overloadThreshold,
  blockerEscalationHours,
  taskStaleDays,
  unresolvedAlertCount,
  lowCredibilityThreshold = 40,
  credibilityScore = 50,
}) {
  const triggers = [];

  // 1) CapacityScore < 20
  const capacityTrigger = safeNum(capacityScore) < 20;
  if (capacityTrigger) triggers.push('CapacityScore < 20');

  // 2) EffectiveTLI exceeds overload threshold
  const overloadTrigger = safeNum(effectiveTli) > safeNum(overloadThreshold, 12);
  if (overloadTrigger) triggers.push('EffectiveTLI > overload threshold');

  // 3) blocker escalation >= 96h
  const blockerTrigger = safeNum(blockerEscalationHours) >= 96;
  if (blockerTrigger) triggers.push('blocker escalation >= 96h');

  // 4) task stale > 4 days
  const staleTrigger = safeNum(taskStaleDays) > 4;
  if (staleTrigger) triggers.push('task stale > 4 days');

  // 5) excessive unresolved alerts
  const alertTrigger = safeNum(unresolvedAlertCount) >= 5;
  if (alertTrigger) triggers.push('excessive unresolved alerts');

  // Component risks (normalized 0..100)
  const staleRisk = normalizeTo100(taskStaleDays, 0, 7);
  const blockerRisk = normalizeTo100(blockerEscalationHours, 0, 120);
  const overloadRisk = computeOverloadRisk({ effectiveTLI: effectiveTli });

  // deadlineRisk: without exact due date we treat stale+overload as proxy
  // Consumers may override with explicit deadline urgency if available.
  const deadlineRisk = overloadTrigger ? 70 : capacityTrigger ? 45 : 20;

  const lowCredibilityRisk = credibilityScore < lowCredibilityThreshold
    ? normalizeTo100(lowCredibilityThreshold - credibilityScore, 0, lowCredibilityThreshold)
    : 0;

  const riskScore = computeRiskScore({ staleRisk, blockerRisk, overloadRisk, deadlineRisk, lowCredibilityRisk });

  return {
    triggers,
    riskScore,
    componentRisks: {
      staleRisk,
      blockerRisk,
      overloadRisk,
      deadlineRisk,
      lowCredibilityRisk,
    },
  };
}

/**
 * Candidate filtering:
 * Exclude:
 * - overloaded interns
 * - inactive interns
 * - blocked interns
 * - interns with RED loadBand
 * - low credibility interns below threshold
 */
function filterCandidates(candidates, {
  overloadThreshold,
  lowCredibilityThreshold,
  redLoadBand = 'RED',
}) {
  return candidates.filter(c => {
    const isOverloaded = safeNum(c.effectiveTli) > safeNum(overloadThreshold, 12);
    const loadBand = c.loadBand ?? determineLoadBand(c.effectiveTli);
    const isRed = loadBand === redLoadBand;
    const isInactive = c.status === 'inactive' || c.isInactive;
    const isBlocked = c.hasBlocker || c.isBlocked;
    const credTooLow = safeNum(c.credibilityScore) < safeNum(lowCredibilityThreshold, 40);

    return !(isOverloaded || isInactive || isBlocked || isRed || credTooLow);
  });
}

/**
 * Builds a candidate shortlist with explainable suitability breakdown.
 */
function generateCandidateShortlist({
  ownerContext,
  candidates,
  overloadThreshold,
  lowCredibilityThreshold,
  topK = 3,
}) {
  const filtered = filterCandidates(candidates, { overloadThreshold, lowCredibilityThreshold });

  const enriched = filtered.map(c => {
    const suitabilityScore = computeSuitabilityScore({
      availabilityScore: c.availabilityScore,
      credibilityScore: c.credibilityScore,
      performanceScore: c.performanceScore,
      effectiveTLI: c.effectiveTli,
      blockerPenalty: c.hasBlocker ? 20 : 0,
      stalePenalty: safeNum(c.staleTasksDays, 0) > 0 ? normalizeTo100(c.staleTasksDays, 0, 7) * 0.2 : 0,
    });

    return {
      internId: c.internId,
      name: c.name,
      suitabilityScore: Math.round(suitabilityScore),
      availabilityScore: Math.round(safeNum(c.availabilityScore)),
      credibilityScore: Math.round(safeNum(c.credibilityScore)),
      performanceScore: Math.round(safeNum(c.performanceScore)),
      effectiveTli: safeNum(c.effectiveTli),
      overloadThreshold: safeNum(overloadThreshold, 12),
      loadBand: c.loadBand ?? determineLoadBand(c.effectiveTli),
      penalties: {
        blockerPenalty: c.hasBlocker ? 20 : 0,
        stalePenalty: Math.round(safeNum(normalizeTo100(c.staleTasksDays, 0, 7) * 0.2, 0)),
      },
      explanation: {
        workload: `Candidate EffectiveTLI=${safeNum(c.effectiveTli).toFixed(2)} (${(c.loadBand ?? determineLoadBand(c.effectiveTli))} load band)`,
        blockerReason: c.hasBlocker ? `Has active blocker (${c.blockerType ?? 'unspecified'})` : 'No active blockers',
        staleReason: c.staleTasksDays && c.staleTasksDays > 0
          ? `Stale risk: ${c.staleTasksDays}d since last meaningful update`
          : 'No stale risk indicators',
      },
    };
  });

  enriched.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  // Guarantee deterministic shortlist length
  return enriched.slice(0, topK);
}

/**
 * Generate reassignment recommendation (recommendation-only).
 */
function generateReassignmentRecommendation({
  owner,
  ownerTask,
  candidates,
  overloadThreshold,
  lowCredibilityThreshold,
  deadlineUrgencyMultiplier = 1,
  topK = 3,
}) {
  const risk = detectReassignmentRisk({
    capacityScore: owner.capacityScore,
    effectiveTli: owner.effectiveTli,
    overloadThreshold,
    blockerEscalationHours: owner.blockerEscalationHours,
    taskStaleDays: ownerTask.staleDays,
    unresolvedAlertCount: owner.unresolvedAlertCount,
    lowCredibilityThreshold,
    credibilityScore: owner.credibilityScore,
  });

  const priority = Math.round(risk.riskScore * safeNum(deadlineUrgencyMultiplier, 1));

  const shortlist = generateCandidateShortlist({
    ownerContext: owner,
    candidates,
    overloadThreshold,
    lowCredibilityThreshold,
    topK,
  });

  const selected = shortlist[0] || null;

  // Explainability requirements
  const whyTriggered =
    risk.triggers.length > 0
      ? risk.triggers
      : ['No major trigger matched; recommendation is low priority/low confidence'];

  const whySelected = selected
    ? [
        `Highest suitabilityScore=${selected.suitabilityScore}`,
        `Availability=${selected.availabilityScore}, Credibility=${selected.credibilityScore}, Performance=${selected.performanceScore}`,
        `Workload fit: EffectiveTLI=${selected.effectiveTli.toFixed(2)} (${selected.loadBand})`,
        `Penalties: blockerPenalty=${selected.penalties.blockerPenalty}, stalePenalty=${selected.penalties.stalePenalty}`,
      ]
    : ['No valid candidates after filtering'];

  return {
    ownerTaskId: ownerTask.id,
    ownerInternId: owner.internId,
    ownerName: owner.name,
    riskScore: Math.round(risk.riskScore),
    priority,
    triggers: whyTriggered,
    componentRisks: risk.componentRisks,
    deadlineUrgencyMultiplier,

    selectionReasoning: whySelected,
    ownerWorkloadReasoning: {
      effectiveTli: safeNum(owner.effectiveTli),
      overloadThreshold: safeNum(overloadThreshold, 12),
      overloadRisk: risk.componentRisks.overloadRisk,
      staleReasoning: `task stale=${safeNum(ownerTask.staleDays)}d (threshold 4d)`,
      blockerReasoning: `blocker escalation=${safeNum(owner.blockerEscalationHours)}h (threshold 96h)`,
      overloadReasoning: `EffectiveTLI=${safeNum(owner.effectiveTli).toFixed(2)} vs threshold=${safeNum(overloadThreshold, 12)}`,
    },

    candidates: shortlist,
    topCandidate: selected,
  };
}

module.exports = {
  detectReassignmentRisk,
  computeRiskScore,
  computeSuitabilityScore,
  generateCandidateShortlist,
  generateReassignmentRecommendation,
};

