/**
 * operational.controller.js — Phase 3, Feature 6
 *
 * Sanitized operational overview for OPERATIONS_LEAD and OPERATIONS_PROGRAM_MANAGER.
 *
 * These roles see:
 *   - workload (task counts, statuses, deadlines)
 *   - bottlenecks (blocked/stale tasks)
 *   - alerts (operational alerts only)
 *   - team-level capacity overview
 *
 * These roles do NOT see:
 *   - private notes
 *   - internal reviews
 *   - confidential lead/admin comments
 *   - individual credibility scores (aggregate only)
 *
 * GET /operational/overview
 */

'use strict';

const prisma = require('../utils/prisma');
const { ok } = require('../utils/respond');
const { isOperationalOverviewOnly } = require('../utils/noteVisibility');

async function getOperationalOverview(req, res, next) {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Parallel queries — all sanitized, no private fields
    const [
      totalTasks,
      activeTasks,
      staleTasks,
      blockedTasks,
      completedLast30,
      upcomingDeadlines,
      openAlerts,
      teamStats,
    ] = await Promise.all([
      // Total non-deleted tasks
      prisma.task.count({ where: { deletedAt: null } }),

      // Active tasks
      prisma.task.count({ where: { status: 'active', deletedAt: null } }),

      // Stale tasks
      prisma.task.count({ where: { status: 'stale', deletedAt: null } }),

      // Blocked tasks
      prisma.task.count({ where: { hasBlocker: true, deletedAt: null } }),

      // Completed in last 30 days
      prisma.task.count({
        where: {
          status:        'completed',
          lastUpdatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt:     null,
        },
      }),

      // Tasks with deadlines in next 48 hours (sanitized — title + deadline only)
      prisma.task.findMany({
        where: {
          status:    { notIn: ['completed', 'cancelled'] },
          deadline:  { lte: in48h, gte: now },
          deletedAt: null,
        },
        select: {
          id:       true,
          title:    true,
          status:   true,
          deadline: true,
          hasBlocker: true,
          intern: {
            select: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { deadline: 'asc' },
        take:    20,
      }),

      // Open operational alerts (no private intern-facing types)
      prisma.alert.findMany({
        where: {
          resolved: false,
          type: {
            in: [
              'blocker_escalation', 'overload', 'stale_task',
              'deadline_approaching', 'low_capacity',
            ],
          },
        },
        select: {
          id:        true,
          type:      true,
          severity:  true,
          message:   true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take:    50,
      }),

      // Team-level capacity (aggregate — no individual scores)
      prisma.userTeam.findMany({
        where: { leftAt: null },
        include: {
          team: { select: { id: true, name: true } },
          user: {
            select: {
              intern: {
                select: {
                  scoreHistory: {
                    where:   { type: 'capacity' },
                    orderBy: { createdAt: 'desc' },
                    take:    1,
                    select:  { score: true },
                  },
                  tasks: {
                    where:  { status: 'active', deletedAt: null },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Aggregate team stats
    const teamMap = {};
    for (const ut of teamStats) {
      const tid = ut.team.id;
      if (!teamMap[tid]) {
        teamMap[tid] = { id: tid, name: ut.team.name, memberCount: 0, totalCapacity: 0, activeTasks: 0 };
      }
      teamMap[tid].memberCount++;
      const score = ut.user.intern?.scoreHistory?.[0]?.score ?? 0;
      teamMap[tid].totalCapacity += score;
      teamMap[tid].activeTasks += ut.user.intern?.tasks?.length ?? 0;
    }

    const teams = Object.values(teamMap).map(t => ({
      id:           t.id,
      name:         t.name,
      memberCount:  t.memberCount,
      avgCapacity:  t.memberCount > 0 ? Math.round(t.totalCapacity / t.memberCount) : 0,
      activeTasks:  t.activeTasks,
    }));

    // Sanitize upcoming deadlines — strip any note fields
    const sanitizedDeadlines = upcomingDeadlines.map(t => ({
      id:          t.id,
      title:       t.title,
      status:      t.status,
      deadline:    t.deadline,
      hasBlocker:  t.hasBlocker,
      assignee:    t.intern?.user?.name ?? null,
    }));

    return ok(res, {
      summary: {
        totalTasks,
        activeTasks,
        staleTasks,
        blockedTasks,
        completedLast30,
        openAlerts: openAlerts.length,
      },
      upcomingDeadlines: sanitizedDeadlines,
      alerts:            openAlerts,
      teams,
    }, 'Operational overview fetched.');
  } catch (err) {
    next(err);
  }
}

module.exports = { getOperationalOverview };
