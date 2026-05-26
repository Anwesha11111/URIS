'use strict';

/**
 * unifiedIntelligenceEngine.js — Unified Enterprise Intelligence Aggregation Layer
 *
 * Aggregates outputs from existing intelligence subsystems into three
 * enterprise-level composite scores:
 *
 *   1. EnterpriseHealth  (0–100) — overall organisational health
 *   2. OperationalRisk   (0–100) — aggregate operational risk index
 *   3. TeamStability     (0–100) — team-level stability and responsiveness
 *
 * IMPORTANT: This module does NOT recompute subsystem logic.
 * It reads already-computed signals from the DB and aggregates them.
 *
 * Subsystems consumed (read-only):
 *   - ScoreHistory (capacity scores)
 *   - CredibilityScore
 *   - Task (stale, blocker, overdue signals)
 *   - Alert (unresolved counts, severity)
 *   - InternDigest (weekly trend snapshots)
 *   - Intern (gdoc staleness for integration intelligence proxy)
 *   - Team / UserTeam (team membership)
 */

const prisma  = require('../utils/prisma');
const logger  = require('../utils/logger');

// ── Utility ───────────────────────────────────────────────────────────────────

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const safeN = (v, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + safeN(v), 0) / arr.length;
}

// ── Thresholds (env-overridable, matching analyticsService) ──────────────────

const OVERLOAD_THRESHOLD     = parseInt(process.env.OVERLOAD_THRESHOLD)     || 12;
const LOW_CAPACITY_THRESHOLD = parseInt(process.env.LOW_CAPACITY_THRESHOLD) || 30;
const LOW_CRED_THRESHOLD     = parseInt(process.env.LOW_CRED_THRESHOLD)     || 40;
const SLA_STALE_DAYS         = parseInt(process.env.SLA_STALE_DAYS)         || 3;
const SLA_SUPPORT_HOURS      = parseInt(process.env.SLA_SUPPORT_HOURS)      || 48;

// ── Weights ───────────────────────────────────────────────────────────────────

const ENTERPRISE_HEALTH_WEIGHTS = {
  workloadHealth:      0.25,
  capacityHealth:      0.25,
  credibilityHealth:   0.20,
  operationalRisk:     0.15,  // inverted: lower risk → higher health
  integrationHealth:   0.15,
};

const OPERATIONAL_RISK_WEIGHTS = {
  staleRisk:              0.20,
  blockerEscalationRisk:  0.25,
  overloadRisk:           0.25,
  reassignmentInstability:0.15,
  inactivityRisk:         0.15,
};

const TEAM_STABILITY_WEIGHTS = {
  availabilityConsistency: 0.25,
  assignmentStability:     0.25,
  responsiveness:          0.20,
  collaborationQuality:    0.15,
  overloadPenalty:         0.15,  // subtracted
};

// ── Raw signal fetcher ────────────────────────────────────────────────────────

/**
 * Fetches all raw signals needed for aggregation in a single parallel batch.
 * Returns a plain object of counts and averages — no subsystem logic.
 */
async function fetchRawSignals() {
  const now          = new Date();
  const staleThresh  = new Date(now.getTime() - SLA_STALE_DAYS * 24 * 60 * 60 * 1000);
  const slaThresh    = new Date(now.getTime() - SLA_SUPPORT_HOURS * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    internCount,
    capacityRows,
    credibilityRows,
    activeTasks,
    staleTasks,
    blockedTasks,
    overdueTasks,
    unresolvedAlerts,
    criticalAlerts,
    inactiveTasks,
    gdocStaleCount,
    teamRows,
    userTeamRows,
  ] = await Promise.all([
    // Total intern count
    prisma.intern.count(),

    // Latest capacity score per intern
    prisma.scoreHistory.findMany({
      where:   { type: 'capacity' },
      orderBy: { createdAt: 'desc' },
      select:  { internId: true, score: true, createdAt: true },
      take:    500,
    }),

    // Credibility scores
    prisma.credibilityScore.findMany({
      select: { internId: true, score: true },
    }),

    // Active task count
    prisma.task.count({ where: { status: 'active' } }),

    // Stale tasks
    prisma.task.count({
      where: {
        status:        { in: ['active', 'stale'] },
        lastUpdatedAt: { lt: staleThresh },
      },
    }),

    // Blocked tasks (active, not completed)
    prisma.task.count({
      where: {
        hasBlocker: true,
        status:     { notIn: ['completed', 'cancelled'] },
      },
    }),

    // Overdue tasks
    prisma.task.count({
      where: {
        deadline: { lt: now, not: null },
        status:   { notIn: ['completed', 'cancelled'] },
      },
    }),

    // Unresolved alerts
    prisma.alert.findMany({
      where:  { resolved: false },
      select: { internId: true, severity: true, type: true, createdAt: true },
    }).catch(() => []),

    // Critical alerts count
    prisma.alert.count({
      where: { resolved: false, severity: 'critical' },
    }).catch(() => 0),

    // Inactive tasks (active, no update in 7 days)
    prisma.task.count({
      where: {
        status:        'active',
        lastUpdatedAt: { lt: sevenDaysAgo },
      },
    }),

    // Interns with stale Google Docs
    prisma.intern.count({
      where: { gdocIsStale: true },
    }).catch(() => 0),

    // Teams
    prisma.team.findMany({ select: { id: true, name: true } }),

    // Active team memberships
    prisma.userTeam.findMany({
      where:  { leftAt: null },
      select: { userId: true, teamId: true },
    }),
  ]);

  // Deduplicate capacity scores: keep latest per intern
  const latestCapacity = {};
  for (const row of capacityRows) {
    if (!latestCapacity[row.internId] || row.createdAt > latestCapacity[row.internId].createdAt) {
      latestCapacity[row.internId] = row;
    }
  }
  const capacityScores = Object.values(latestCapacity).map(r => safeN(r.score));

  // Credibility scores (0–1 float in DB → convert to 0–100)
  const credScores = credibilityRows.map(r => safeN(r.score) * 100);

  // Interns with low capacity
  const lowCapacityCount = capacityScores.filter(s => s < LOW_CAPACITY_THRESHOLD).length;

  // Interns with low credibility
  const lowCredCount = credScores.filter(s => s < LOW_CRED_THRESHOLD).length;

  // Overloaded interns proxy: capacity < 20 (severe) as overload signal
  const overloadedCount = capacityScores.filter(s => s < 20).length;

  // Unresolved alert counts by intern
  const alertsByIntern = {};
  for (const a of unresolvedAlerts) {
    alertsByIntern[a.internId] = (alertsByIntern[a.internId] || 0) + 1;
  }
  // Interns with 5+ unresolved alerts = reassignment instability signal
  const reassignmentInstabilityCount = Object.values(alertsByIntern).filter(c => c >= 5).length;

  return {
    internCount,
    activeTasks,
    staleTasks,
    blockedTasks,
    overdueTasks,
    unresolvedAlertCount: unresolvedAlerts.length,
    criticalAlerts,
    inactiveTasks,
    gdocStaleCount,
    lowCapacityCount,
    lowCredCount,
    overloadedCount,
    reassignmentInstabilityCount,
    avgCapacity:     avg(capacityScores),
    avgCredibility:  avg(credScores),
    capacityScores,
    credScores,
    teamRows,
    userTeamRows,
  };
}

// ── 1. Enterprise Health Score ────────────────────────────────────────────────

/**
 * EnterpriseHealth = weighted blend of:
 *   - workloadHealth      (25%): fraction of interns NOT overloaded
 *   - capacityHealth      (25%): avg capacity score normalised 0–100
 *   - credibilityHealth   (20%): avg credibility score normalised 0–100
 *   - operationalRisk     (15%): inverted — lower risk → higher health
 *   - integrationHealth   (15%): fraction of interns with healthy gdoc activity
 *
 * @param {object} signals - raw signals from fetchRawSignals()
 * @param {number} operationalRisk - pre-computed OperationalRisk score (0–100)
 * @returns {{ score: number, label: string, components: object, explainability: object }}
 */
function computeEnterpriseHealth(signals, operationalRisk) {
  const {
    internCount,
    overloadedCount,
    avgCapacity,
    avgCredibility,
    gdocStaleCount,
  } = signals;

  const n = Math.max(internCount, 1);

  // workloadHealth: fraction of interns not overloaded → 0–100
  const workloadHealth = clamp(((n - overloadedCount) / n) * 100);

  // capacityHealth: avg capacity score is already 0–100
  const capacityHealth = clamp(avgCapacity);

  // credibilityHealth: avg credibility is already 0–100
  const credibilityHealth = clamp(avgCredibility);

  // operationalRisk contribution: invert so lower risk = higher health
  const riskHealth = clamp(100 - operationalRisk);

  // integrationHealth: fraction of interns with non-stale gdoc → 0–100
  const integrationHealth = clamp(((n - gdocStaleCount) / n) * 100);

  const score = clamp(
    workloadHealth      * ENTERPRISE_HEALTH_WEIGHTS.workloadHealth +
    capacityHealth      * ENTERPRISE_HEALTH_WEIGHTS.capacityHealth +
    credibilityHealth   * ENTERPRISE_HEALTH_WEIGHTS.credibilityHealth +
    riskHealth          * ENTERPRISE_HEALTH_WEIGHTS.operationalRisk +
    integrationHealth   * ENTERPRISE_HEALTH_WEIGHTS.integrationHealth
  );

  const label =
    score >= 75 ? 'Healthy'
    : score >= 50 ? 'Moderate'
    : score >= 30 ? 'At Risk'
    : 'Critical';

  return {
    score:  Math.round(score),
    label,
    components: {
      workloadHealth:    Math.round(workloadHealth),
      capacityHealth:    Math.round(capacityHealth),
      credibilityHealth: Math.round(credibilityHealth),
      riskHealth:        Math.round(riskHealth),
      integrationHealth: Math.round(integrationHealth),
    },
    explainability: {
      contributingSystems: ['TLI Engine', 'CapacityScore', 'CredibilityEngine', 'OperationalRisk', 'IntegrationIntelligence'],
      weightingBreakdown: ENTERPRISE_HEALTH_WEIGHTS,
      workloadReasoning:    `${overloadedCount}/${n} interns overloaded (capacity < 20)`,
      capacityReasoning:    `Avg capacity score: ${Math.round(avgCapacity)}/100`,
      credibilityReasoning: `Avg credibility score: ${Math.round(avgCredibility)}/100`,
      integrationReasoning: `${gdocStaleCount}/${n} interns with stale Google Docs`,
      detectedRisks: [
        overloadedCount > 0      && `${overloadedCount} overloaded intern(s)`,
        gdocStaleCount > 0       && `${gdocStaleCount} stale Google Doc(s)`,
        avgCapacity < 40         && 'Low average capacity across team',
        avgCredibility < 50      && 'Low average credibility across team',
      ].filter(Boolean),
    },
  };
}

// ── 2. Operational Risk Index ─────────────────────────────────────────────────

/**
 * OperationalRisk = weighted sum of:
 *   - staleRisk              (20%): stale tasks / active tasks
 *   - blockerEscalationRisk  (25%): blocked tasks / active tasks
 *   - overloadRisk           (25%): overloaded interns / total interns
 *   - reassignmentInstability(15%): interns with 5+ unresolved alerts / total
 *   - inactivityRisk         (15%): inactive tasks / active tasks
 *
 * @param {object} signals
 * @returns {{ score: number, label: string, components: object, explainability: object }}
 */
function computeOperationalRiskIndex(signals) {
  const {
    internCount,
    activeTasks,
    staleTasks,
    blockedTasks,
    overloadedCount,
    reassignmentInstabilityCount,
    inactiveTasks,
    criticalAlerts,
    unresolvedAlertCount,
  } = signals;

  const taskBase   = Math.max(activeTasks, 1);
  const internBase = Math.max(internCount, 1);

  // Each component normalized 0–100
  const staleRisk              = clamp((staleTasks / taskBase) * 100);
  const blockerEscalationRisk  = clamp((blockedTasks / taskBase) * 100);
  const overloadRisk           = clamp((overloadedCount / internBase) * 100);
  const reassignmentInstability= clamp((reassignmentInstabilityCount / internBase) * 100);
  const inactivityRisk         = clamp((inactiveTasks / taskBase) * 100);

  // Critical alert amplifier: if critical alerts exist, boost risk by up to 15 points
  const criticalAmplifier = clamp(criticalAlerts * 3, 0, 15);

  const baseScore = clamp(
    staleRisk              * OPERATIONAL_RISK_WEIGHTS.staleRisk +
    blockerEscalationRisk  * OPERATIONAL_RISK_WEIGHTS.blockerEscalationRisk +
    overloadRisk           * OPERATIONAL_RISK_WEIGHTS.overloadRisk +
    reassignmentInstability* OPERATIONAL_RISK_WEIGHTS.reassignmentInstability +
    inactivityRisk         * OPERATIONAL_RISK_WEIGHTS.inactivityRisk
  );

  const score = clamp(baseScore + criticalAmplifier);

  const label =
    score >= 70 ? 'Critical'
    : score >= 45 ? 'High'
    : score >= 25 ? 'Moderate'
    : 'Low';

  return {
    score:  Math.round(score),
    label,
    components: {
      staleRisk:               Math.round(staleRisk),
      blockerEscalationRisk:   Math.round(blockerEscalationRisk),
      overloadRisk:            Math.round(overloadRisk),
      reassignmentInstability: Math.round(reassignmentInstability),
      inactivityRisk:          Math.round(inactivityRisk),
      criticalAmplifier:       Math.round(criticalAmplifier),
    },
    explainability: {
      contributingSystems: ['TLI Engine', 'AlertService', 'StaleAutomation', 'BlockerEscalation', 'ReassignmentEngine'],
      weightingBreakdown: OPERATIONAL_RISK_WEIGHTS,
      workloadReasoning:    `${staleTasks} stale, ${blockedTasks} blocked, ${inactiveTasks} inactive out of ${activeTasks} active tasks`,
      credibilityReasoning: `${reassignmentInstabilityCount} intern(s) with 5+ unresolved alerts`,
      integrationReasoning: `${criticalAlerts} critical unresolved alert(s) (amplifier: +${Math.round(criticalAmplifier)})`,
      detectedRisks: [
        staleTasks > 0              && `${staleTasks} stale task(s)`,
        blockedTasks > 0            && `${blockedTasks} blocked task(s)`,
        overloadedCount > 0         && `${overloadedCount} overloaded intern(s)`,
        reassignmentInstabilityCount > 0 && `${reassignmentInstabilityCount} intern(s) with excessive alerts`,
        inactiveTasks > 0           && `${inactiveTasks} inactive task(s)`,
        criticalAlerts > 0          && `${criticalAlerts} critical alert(s)`,
      ].filter(Boolean),
    },
  };
}

// ── 3. Team Stability Index ───────────────────────────────────────────────────

/**
 * TeamStability = weighted blend of:
 *   - availabilityConsistency (25%): avg capacity score across teams
 *   - assignmentStability     (25%): fraction of interns with capacity >= LOW_CAPACITY_THRESHOLD
 *   - responsiveness          (20%): avg credibility score (proxy for responsiveness)
 *   - collaborationQuality    (15%): fraction of interns with healthy credibility
 *   - overloadPenalty         (15%): subtracted — fraction of overloaded interns
 *
 * @param {object} signals
 * @returns {{ score: number, label: string, components: object, explainability: object }}
 */
function computeTeamStability(signals) {
  const {
    internCount,
    avgCapacity,
    avgCredibility,
    lowCapacityCount,
    lowCredCount,
    overloadedCount,
    capacityScores,
    credScores,
  } = signals;

  const n = Math.max(internCount, 1);

  // availabilityConsistency: avg capacity normalised 0–100
  const availabilityConsistency = clamp(avgCapacity);

  // assignmentStability: fraction of interns with capacity >= threshold
  const stableInterns = capacityScores.filter(s => s >= LOW_CAPACITY_THRESHOLD).length;
  const assignmentStability = clamp((stableInterns / n) * 100);

  // responsiveness: avg credibility as proxy (credibility engine measures responsiveness)
  const responsiveness = clamp(avgCredibility);

  // collaborationQuality: fraction of interns with credibility >= LOW_CRED_THRESHOLD
  const healthyCredInterns = credScores.filter(s => s >= LOW_CRED_THRESHOLD).length;
  const collaborationQuality = clamp((healthyCredInterns / n) * 100);

  // overloadPenalty: fraction of overloaded interns (subtracted)
  const overloadPenalty = clamp((overloadedCount / n) * 100);

  const score = clamp(
    availabilityConsistency * TEAM_STABILITY_WEIGHTS.availabilityConsistency +
    assignmentStability     * TEAM_STABILITY_WEIGHTS.assignmentStability +
    responsiveness          * TEAM_STABILITY_WEIGHTS.responsiveness +
    collaborationQuality    * TEAM_STABILITY_WEIGHTS.collaborationQuality -
    overloadPenalty         * TEAM_STABILITY_WEIGHTS.overloadPenalty
  );

  const label =
    score >= 75 ? 'Stable'
    : score >= 50 ? 'Moderate'
    : score >= 30 ? 'Unstable'
    : 'Critical';

  return {
    score:  Math.round(score),
    label,
    components: {
      availabilityConsistency: Math.round(availabilityConsistency),
      assignmentStability:     Math.round(assignmentStability),
      responsiveness:          Math.round(responsiveness),
      collaborationQuality:    Math.round(collaborationQuality),
      overloadPenalty:         Math.round(overloadPenalty),
    },
    explainability: {
      contributingSystems: ['CapacityScore', 'CredibilityEngine', 'TLI Engine'],
      weightingBreakdown: TEAM_STABILITY_WEIGHTS,
      workloadReasoning:    `${stableInterns}/${n} interns with capacity >= ${LOW_CAPACITY_THRESHOLD}`,
      credibilityReasoning: `${healthyCredInterns}/${n} interns with credibility >= ${LOW_CRED_THRESHOLD}`,
      integrationReasoning: `Avg capacity: ${Math.round(avgCapacity)}, Avg credibility: ${Math.round(avgCredibility)}`,
      detectedRisks: [
        lowCapacityCount > 0  && `${lowCapacityCount} intern(s) with low capacity`,
        lowCredCount > 0      && `${lowCredCount} intern(s) with low credibility`,
        overloadedCount > 0   && `${overloadedCount} overloaded intern(s) penalising stability`,
      ].filter(Boolean),
    },
  };
}

// ── Executive Summary ─────────────────────────────────────────────────────────

/**
 * Generates a plain-language executive summary from the three composite scores.
 */
function buildExecutiveSummary({ enterpriseHealth, operationalRisk, teamStability, signals }) {
  const { staleTasks, blockedTasks, criticalAlerts, unresolvedAlertCount, internCount, activeTasks } = signals;

  const urgentActions = [];
  if (criticalAlerts > 0)    urgentActions.push(`Resolve ${criticalAlerts} critical alert(s) immediately`);
  if (blockedTasks > 0)      urgentActions.push(`Unblock ${blockedTasks} task(s) with active blockers`);
  if (staleTasks > 0)        urgentActions.push(`Follow up on ${staleTasks} stale task(s)`);
  if (operationalRisk.score >= 70) urgentActions.push('Operational risk is critical — review workload distribution');
  if (teamStability.score < 30)    urgentActions.push('Team stability is critical — consider capacity rebalancing');

  const crossSystemWarnings = [];
  if (enterpriseHealth.score < 50 && operationalRisk.score > 50)
    crossSystemWarnings.push('Enterprise health and operational risk are both degraded — systemic intervention needed');
  if (teamStability.score < 50 && operationalRisk.score > 45)
    crossSystemWarnings.push('Team instability is amplifying operational risk');
  if (signals.gdocStaleCount > internCount * 0.3)
    crossSystemWarnings.push('More than 30% of interns have stale documentation — integration health at risk');

  return {
    headline: `Enterprise is ${enterpriseHealth.label} · Risk is ${operationalRisk.label} · Teams are ${teamStability.label}`,
    urgentActions,
    crossSystemWarnings,
    operationalSnapshot: {
      totalInterns:         internCount,
      activeTasks,
      unresolvedAlerts:     unresolvedAlertCount,
      criticalAlerts,
      staleTasks,
      blockedTasks,
    },
  };
}

// ── Main aggregation function ─────────────────────────────────────────────────

/**
 * aggregateUnifiedIntelligence()
 *
 * Orchestrates all three composite scores and returns the full unified payload.
 * This is the primary export consumed by the analytics controller and realtime engine.
 *
 * @returns {Promise<UnifiedIntelligencePayload>}
 */
async function aggregateUnifiedIntelligence() {
  const signals = await fetchRawSignals();

  // Compute in dependency order: OperationalRisk first (needed by EnterpriseHealth)
  const operationalRisk   = computeOperationalRiskIndex(signals);
  const enterpriseHealth  = computeEnterpriseHealth(signals, operationalRisk.score);
  const teamStability     = computeTeamStability(signals);
  const executiveSummary  = buildExecutiveSummary({ enterpriseHealth, operationalRisk, teamStability, signals });

  return {
    computedAt: new Date().toISOString(),
    enterpriseHealth,
    operationalRisk,
    teamStability,
    executiveSummary,
    // Real-time signal snapshot for live dashboard indicators
    liveSignals: {
      unresolvedEscalations: signals.criticalAlerts,
      overloadWarnings:      signals.overloadedCount,
      staleTaskWarnings:     signals.staleTasks,
      reassignmentInstability: signals.reassignmentInstabilityCount,
      integrationRiskCount:  signals.gdocStaleCount,
      totalUnresolvedAlerts: signals.unresolvedAlertCount,
    },
  };
}

module.exports = {
  aggregateUnifiedIntelligence,
  computeEnterpriseHealth,
  computeOperationalRiskIndex,
  computeTeamStability,
};
