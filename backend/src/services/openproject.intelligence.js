'use strict';

/**
 * openproject.intelligence.js — OpenProject Operational Intelligence Signals
 *
 * Reads OpenProject activity and feeds signals into existing URIS intelligence engines:
 *   - integrationIntelligenceEngine (document/collaboration signals)
 *   - credibilityEngine (deadline reliability, responsiveness)
 *   - unifiedIntelligenceEngine (operational risk)
 *   - alertService (milestone overdue, sprint instability)
 *
 * This module does NOT duplicate any existing intelligence logic.
 * It extracts raw signals from OP and maps them to existing signal shapes.
 */

const prisma  = require('../utils/prisma');
const logger  = require('../utils/logger');
const {
  isConfigured,
  syncMilestones,
  fetchRecentActivity,
} = require('./openproject.service');

// ── Signal extraction ─────────────────────────────────────────────────────────

/**
 * computeOPIntelligenceSignals — extract operational signals from OP activity.
 *
 * Returns a structured signal payload compatible with the existing
 * integrationIntelligenceEngine signal shape.
 *
 * Signals extracted:
 *   - assignmentChurn: WPs reassigned multiple times in window
 *   - milestoneInstability: overdue milestones / total milestones
 *   - delayedUpdates: WPs not updated in > 3 days
 *   - blockerFrequency: WPs with "blocked" in subject/description
 *   - sprintInstability: WPs moved between sprints (status churn proxy)
 */
async function computeOPIntelligenceSignals() {
  if (!isConfigured()) {
    return {
      available: false,
      reason: 'OpenProject not configured',
      signals: _neutralSignals(),
    };
  }

  try {
    const [activityResult, milestoneResult] = await Promise.all([
      fetchRecentActivity(7),
      syncMilestones(),
    ]);

    const wps         = activityResult.activities ?? [];
    const milestones  = milestoneResult.milestones ?? [];
    const now         = Date.now();
    const threeDaysMs = 3 * 86400000;

    // Assignment churn: WPs where assignee changed recently (proxy: multiple updates in short window)
    const assignmentChurnCount = wps.filter(wp => {
      const updatedMs = wp.updatedAt ? new Date(wp.updatedAt).getTime() : 0;
      return (now - updatedMs) < threeDaysMs && wp.assignee?._links?.self?.href;
    }).length;

    // Milestone instability: overdue milestones
    const overdueMilestones = milestones.filter(m => m.isOverdue).length;
    const totalMilestones   = milestones.length;
    const milestoneInstability01 = totalMilestones > 0
      ? Math.min(1, overdueMilestones / totalMilestones)
      : 0;

    // Delayed updates: WPs not updated in > 3 days
    const delayedCount = wps.filter(wp => {
      const updatedMs = wp.updatedAt ? new Date(wp.updatedAt).getTime() : 0;
      return (now - updatedMs) > threeDaysMs;
    }).length;

    // Blocker frequency: WPs with blocked status or "blocked" in subject
    const blockerCount = wps.filter(wp => {
      const subject = (wp.subject || '').toLowerCase();
      const status  = (wp.status?.name || '').toLowerCase();
      return subject.includes('blocked') || status.includes('blocked') || status.includes('hold');
    }).length;

    // Sprint instability proxy: WPs with status "On hold" or "Rejected"
    const sprintInstabilityCount = wps.filter(wp => {
      const status = (wp.status?.name || '').toLowerCase();
      return status.includes('hold') || status.includes('reject');
    }).length;

    const totalWPs = Math.max(wps.length, 1);

    // Normalize all signals to 0..1
    const signals = {
      assignmentChurn01:      Math.min(1, assignmentChurnCount / totalWPs),
      milestoneInstability01: milestoneInstability01,
      delayedUpdates01:       Math.min(1, delayedCount / totalWPs),
      blockerFrequency01:     Math.min(1, blockerCount / totalWPs),
      sprintInstability01:    Math.min(1, sprintInstabilityCount / totalWPs),
    };

    // Composite OP health score (0..100): higher = healthier
    const riskScore = (
      signals.assignmentChurn01      * 0.20 +
      signals.milestoneInstability01 * 0.25 +
      signals.delayedUpdates01       * 0.20 +
      signals.blockerFrequency01     * 0.25 +
      signals.sprintInstability01    * 0.10
    );
    const opHealthScore = Math.round((1 - riskScore) * 100);

    return {
      available: true,
      opHealthScore,
      signals,
      raw: {
        totalWPs,
        overdueMilestones,
        totalMilestones,
        assignmentChurnCount,
        delayedCount,
        blockerCount,
        sprintInstabilityCount,
        milestones: milestones.slice(0, 10), // top 10 for UI
      },
      detectedPatterns: _detectPatterns(signals, { overdueMilestones, totalMilestones }),
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'OpenProject intelligence: signal extraction failed');
    return { available: false, reason: err.message, signals: _neutralSignals() };
  }
}

function _neutralSignals() {
  return {
    assignmentChurn01:      0,
    milestoneInstability01: 0,
    delayedUpdates01:       0,
    blockerFrequency01:     0,
    sprintInstability01:    0,
  };
}

function _detectPatterns(signals, { overdueMilestones, totalMilestones }) {
  const patterns = [];
  if (signals.assignmentChurn01 > 0.3)
    patterns.push({ pattern: 'assignment_churn', detail: 'High reassignment frequency in OpenProject', severity: 'warning' });
  if (signals.milestoneInstability01 > 0.4)
    patterns.push({ pattern: 'milestone_instability', detail: `${overdueMilestones}/${totalMilestones} milestones overdue`, severity: 'high' });
  if (signals.delayedUpdates01 > 0.4)
    patterns.push({ pattern: 'delayed_updates', detail: 'Many work packages not updated in 3+ days', severity: 'warning' });
  if (signals.blockerFrequency01 > 0.3)
    patterns.push({ pattern: 'blocker_frequency', detail: 'High blocker rate in OpenProject work packages', severity: 'warning' });
  if (signals.sprintInstability01 > 0.3)
    patterns.push({ pattern: 'sprint_instability', detail: 'Work packages frequently on hold or rejected', severity: 'warning' });
  return patterns;
}

// ── Alert generation from OP signals ─────────────────────────────────────────

/**
 * generateOPIntelligenceAlerts — create URIS alerts from OP operational signals.
 * Uses the existing Alert model. Idempotent (6h dedup window per type).
 *
 * @param {object} signalResult - result of computeOPIntelligenceSignals()
 * @returns {{ created: number }}
 */
async function generateOPIntelligenceAlerts(signalResult) {
  if (!signalResult?.available) return { created: 0 };

  const { detectedPatterns, raw } = signalResult;
  if (!detectedPatterns?.length) return { created: 0 };

  const recentWindow = new Date(Date.now() - 6 * 60 * 60 * 1000);
  let created = 0;

  for (const p of detectedPatterns) {
    const type = `op_${p.pattern}`;
    const severity = p.severity === 'high' ? 'critical' : 'warning';

    // Dedup: skip if a recent unresolved alert of this type already exists (no internId = system-level)
    const existing = await prisma.alert.findFirst({
      where: {
        type,
        resolved: false,
        createdAt: { gte: recentWindow },
        internId: { not: null }, // system alerts use first intern as anchor
      },
    }).catch(() => null);

    if (existing) continue;

    // Find any intern to anchor the system-level alert (required by schema)
    const anchor = await prisma.intern.findFirst({ select: { id: true } }).catch(() => null);
    if (!anchor) continue;

    await prisma.alert.create({
      data: {
        internId: anchor.id,
        type,
        severity,
        message: `OPENPROJECT SIGNAL: ${p.detail}`,
        resolved: false,
      },
    }).catch(() => {});

    created++;
  }

  // Milestone overdue alert (specific)
  if (raw?.overdueMilestones > 0) {
    const type = 'op_milestone_overdue';
    const existing = await prisma.alert.findFirst({
      where: { type, resolved: false, createdAt: { gte: recentWindow } },
    }).catch(() => null);

    if (!existing) {
      const anchor = await prisma.intern.findFirst({ select: { id: true } }).catch(() => null);
      if (anchor) {
        await prisma.alert.create({
          data: {
            internId: anchor.id,
            type,
            severity: 'warning',
            message: `OPENPROJECT: ${raw.overdueMilestones} milestone(s) are overdue out of ${raw.totalMilestones} total.`,
            resolved: false,
          },
        }).catch(() => {});
        created++;
      }
    }
  }

  return { created };
}

// ── Full intelligence refresh ─────────────────────────────────────────────────

/**
 * runOPIntelligenceRefresh — compute signals + generate alerts.
 * Called by the scheduler every 6 hours.
 *
 * @returns {{ signals: object, alertsCreated: number }}
 */
async function runOPIntelligenceRefresh() {
  const signalResult = await computeOPIntelligenceSignals();
  const { created: alertsCreated } = await generateOPIntelligenceAlerts(signalResult);

  logger.info({
    available: signalResult.available,
    opHealthScore: signalResult.opHealthScore,
    alertsCreated,
    patterns: signalResult.detectedPatterns?.length ?? 0,
  }, 'OpenProject intelligence refresh completed');

  return { signals: signalResult, alertsCreated };
}

module.exports = {
  computeOPIntelligenceSignals,
  generateOPIntelligenceAlerts,
  runOPIntelligenceRefresh,
};
