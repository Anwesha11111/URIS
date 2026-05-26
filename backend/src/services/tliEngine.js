'use strict';

/**
 * tliEngine.js — foundational Task Load Intelligence (TLI)
 *
 * This module is intentionally framework-agnostic:
 * - Pure calculations only
 * - No DB access
 */

function calculateTaskTLI(task) {
  const complexity = Number(task?.complexity ?? 1);
  const progressPct = Number(task?.progressPct ?? 0);

  const safeComplexity = Number.isFinite(complexity) ? complexity : 1;
  const safeProgress = Number.isFinite(progressPct) ? progressPct : 0;

  // Formula: complexity × (1 - progressPct/100)
  const raw = safeComplexity * (1 - safeProgress / 100);
  return Math.max(0, raw);
}

function calculateInternTLI(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  return list.reduce((sum, t) => sum + calculateTaskTLI(t), 0);
}

function calculateEffectiveTLI(rawTli, capacityScore, credibility) {
  const tli = Number(rawTli ?? 0);
  const cap = Number(capacityScore ?? 0);
  const cred = Number(credibility ?? 0);

  const safeTli = Number.isFinite(tli) ? tli : 0;
  const safeCap = Number.isFinite(cap) ? cap : 0;
  const safeCred = Number.isFinite(cred) ? cred : 0;

  // Blend policy (foundational; tune later):
  // - workload drives effectiveTli directly
  // - capacity and credibility act as stabilizers
  //   (higher capacity/credibility reduces effective load)
  //
  // Interpret inputs:
  // - capacityScore: 0–100
  // - credibility: 0–1 or 0–100 are possible in existing code; normalize heuristically.
  //
  // Normalization:
  // - if credibility <= 1.5 treat as 0–1 scale
  // - else assume 0–100
  let cred01 = safeCred;
  if (cred01 > 1.5) cred01 = cred01 / 100;
  if (!Number.isFinite(cred01)) cred01 = 0;

  const cap01 = safeCap / 100;

  const capacityFactor = 1 - Math.min(1, Math.max(0, cap01)); // capacity of 100 => 0 penalty
  const credibilityFactor = 1 - Math.min(1, Math.max(0, cred01));

  // Weighted blend:
  // effective = workload * (0.60*workloadWeight + 0.40*(capacity+cred reductions))
  // Simpler: reduce effective by averaged stability.
  const stability = 0.5 * (1 - capacityFactor) + 0.5 * (1 - credibilityFactor); // 0..1
  const multiplier = 1 - 0.35 * Math.min(1, Math.max(0, stability));

  return safeTli * multiplier;
}

function determineLoadBand(tli) {
  const n = Number(tli ?? 0);
  const value = Number.isFinite(n) ? n : 0;

  // Foundational thresholds. These should be tuned with real distributions.
  // - GREEN: <= 2
  // - AMBER: 2..5
  // - RED: > 5
  if (value <= 2) return 'GREEN';
  if (value <= 5) return 'AMBER';
  return 'RED';
}

module.exports = {
  calculateTaskTLI,
  calculateInternTLI,
  calculateEffectiveTLI,
  determineLoadBand,
};

