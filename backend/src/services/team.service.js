/**
 * team.service.js
 *
 * Multi-team membership logic.
 *
 * Key design decisions:
 *  - leftAt = null  → currently active member
 *  - leftAt = Date  → historical record, never deleted
 *  - A user can have multiple UserTeam rows for the same team (re-join after leaving)
 *  - Global performance (ScoreHistory, Reviews) is never scoped to a team —
 *    it belongs to the intern regardless of team membership
 *  - Team-specific contribution is derived from tasks completed while the
 *    user was an active member of that team
 */

const prisma = require('../utils/prisma');

// ── Teams ─────────────────────────────────────────────────────────────────────

async function createTeam({ name, description = null }) {
  const existing = await prisma.team.findUnique({ where: { name } });
  if (existing) {
    const err = new Error(`Team "${name}" already exists.`);
    err.status = 409;
    throw err;
  }
  return prisma.team.create({ data: { name, description } });
}

async function listTeams() {
  return prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: { where: { leftAt: null } } } },
    },
  });
}

async function getTeamById(teamId) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where:   { leftAt: null },
        include: { user: { select: { id: true, email: true, role: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  if (!team) {
    const err = new Error('Team not found.');
    err.status = 404;
    throw err;
  }
  return team;
}

// ── Membership ────────────────────────────────────────────────────────────────

/**
 * Add a user to a team. Idempotent — if already an active member, returns
 * the existing record without creating a duplicate.
 */
async function joinTeam({ userId, teamId, role = 'member' }) {
  // Verify team exists
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    const err = new Error('Team not found.');
    err.status = 404;
    throw err;
  }

  // Check for existing active membership
  const active = await prisma.userTeam.findFirst({
    where: { userId, teamId, leftAt: null },
  });
  if (active) return active;   // already a member — idempotent

  return prisma.userTeam.create({ data: { userId, teamId, role } });
}

/**
 * Remove a user from a team by setting leftAt.
 * The historical record is preserved — never deleted.
 */
async function leaveTeam({ userId, teamId }) {
  const active = await prisma.userTeam.findFirst({
    where: { userId, teamId, leftAt: null },
  });
  if (!active) {
    const err = new Error('User is not an active member of this team.');
    err.status = 400;
    throw err;
  }

  return prisma.userTeam.update({
    where: { id: active.id },
    data:  { leftAt: new Date() },
  });
}

/**
 * Returns all teams a user currently belongs to (leftAt = null).
 */
async function getUserTeams(userId) {
  return prisma.userTeam.findMany({
    where:   { userId, leftAt: null },
    include: { team: true },
    orderBy: { joinedAt: 'asc' },
  });
}

/**
 * Returns the full membership history for a user across all teams.
 * Includes past memberships (leftAt != null).
 */
async function getUserTeamHistory(userId) {
  return prisma.userTeam.findMany({
    where:   { userId },
    include: { team: true },
    orderBy: { joinedAt: 'desc' },
  });
}

// ── Team-specific contribution stats ─────────────────────────────────────────

/**
 * Returns task completion stats for a user scoped to their active membership
 * window in a specific team.
 *
 * Only counts tasks completed while the user was an active member.
 * Global performance (ScoreHistory) is returned separately — it is never
 * scoped to a team.
 */
async function getTeamContribution({ userId, teamId }) {
  // Find the intern record for this user
  const intern = await prisma.intern.findUnique({
    where:   { userId },
    include: { scoreHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!intern) return { tasksCompleted: 0, tasksActive: 0, latestScore: null };

  // Find the membership window(s) for this team
  const memberships = await prisma.userTeam.findMany({
    where: { userId, teamId },
    orderBy: { joinedAt: 'asc' },
  });
  if (memberships.length === 0) return { tasksCompleted: 0, tasksActive: 0, latestScore: null };

  // Build date range filters from membership windows
  const dateFilters = memberships.map(m => ({
    createdAt: {
      gte: m.joinedAt,
      ...(m.leftAt ? { lte: m.leftAt } : {}),
    },
  }));

  const [completed, active] = await Promise.all([
    prisma.task.count({
      where: { internId: intern.id, status: 'completed', OR: dateFilters },
    }),
    prisma.task.count({
      where: { internId: intern.id, status: 'active', OR: dateFilters },
    }),
  ]);

  return {
    tasksCompleted: completed,
    tasksActive:    active,
    latestScore:    intern.scoreHistory[0]?.score ?? null,
  };
}

module.exports = {
  createTeam,
  listTeams,
  getTeamById,
  joinTeam,
  leaveTeam,
  getUserTeams,
  getUserTeamHistory,
  getTeamContribution,
};
