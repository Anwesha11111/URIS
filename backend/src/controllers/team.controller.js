const {
  createTeam,
  listTeams,
  getTeamById,
  joinTeam,
  leaveTeam,
  getUserTeams,
  getUserTeamHistory,
  getTeamContribution,
} = require('../services/team.service');

// ── Admin endpoints ───────────────────────────────────────────────────────────

/** POST /teams — create a new team (admin only) */
async function createTeamHandler(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'name is required.', data: null });
    }
    const team = await createTeam({ name: name.trim(), description });
    return res.status(201).json({ success: true, message: 'Team created.', data: team });
  } catch (err) { next(err); }
}

/** GET /teams — list all teams with active member count */
async function listTeamsHandler(req, res, next) {
  try {
    const teams = await listTeams();
    return res.status(200).json({ success: true, data: teams });
  } catch (err) { next(err); }
}

/** GET /teams/:teamId — team detail with active members */
async function getTeamHandler(req, res, next) {
  try {
    const team = await getTeamById(req.params.teamId);
    return res.status(200).json({ success: true, data: team });
  } catch (err) { next(err); }
}

// ── Membership endpoints (any authenticated user) ─────────────────────────────

/** POST /teams/:teamId/join — join a team */
async function joinTeamHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const role       = req.body.role ?? 'member';
    const membership = await joinTeam({ userId, teamId, role });
    return res.status(200).json({ success: true, message: 'Joined team.', data: membership });
  } catch (err) { next(err); }
}

/** POST /teams/:teamId/leave — leave a team */
async function leaveTeamHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const membership = await leaveTeam({ userId, teamId });
    return res.status(200).json({ success: true, message: 'Left team.', data: membership });
  } catch (err) { next(err); }
}

/** GET /teams/my — current user's active team memberships */
async function getMyTeamsHandler(req, res, next) {
  try {
    const memberships = await getUserTeams(req.user.id);
    return res.status(200).json({ success: true, data: memberships });
  } catch (err) { next(err); }
}

/** GET /teams/my/history — full team membership history */
async function getMyTeamHistoryHandler(req, res, next) {
  try {
    const history = await getUserTeamHistory(req.user.id);
    return res.status(200).json({ success: true, data: history });
  } catch (err) { next(err); }
}

/**
 * GET /teams/:teamId/contribution
 * Returns team-scoped task stats for the current user.
 * Global performance stats are fetched separately via /intern/dashboard.
 */
async function getContributionHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const stats      = await getTeamContribution({ userId, teamId });
    return res.status(200).json({ success: true, data: stats });
  } catch (err) { next(err); }
}

module.exports = {
  createTeamHandler,
  listTeamsHandler,
  getTeamHandler,
  joinTeamHandler,
  leaveTeamHandler,
  getMyTeamsHandler,
  getMyTeamHistoryHandler,
  getContributionHandler,
};
