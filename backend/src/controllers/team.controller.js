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
const { ok, created, validationError } = require('../utils/respond');

async function createTeamHandler(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return validationError(res, 'name is required');
    }
    const team = await createTeam({ name: name.trim(), description });
    return created(res, team, 'Team created.');
  } catch (err) { next(err); }
}

async function listTeamsHandler(req, res, next) {
  try {
    const teams = await listTeams();
    return ok(res, teams);
  } catch (err) { next(err); }
}

async function getTeamHandler(req, res, next) {
  try {
    const team = await getTeamById(req.params.teamId);
    return ok(res, team);
  } catch (err) { next(err); }
}

async function joinTeamHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const role       = req.body.role ?? 'member';
    const membership = await joinTeam({ userId, teamId, role });
    return ok(res, membership, 'Joined team.');
  } catch (err) { next(err); }
}

async function leaveTeamHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const membership = await leaveTeam({ userId, teamId });
    return ok(res, membership, 'Left team.');
  } catch (err) { next(err); }
}

async function getMyTeamsHandler(req, res, next) {
  try {
    const memberships = await getUserTeams(req.user.id);
    return ok(res, memberships);
  } catch (err) { next(err); }
}

async function getMyTeamHistoryHandler(req, res, next) {
  try {
    const history = await getUserTeamHistory(req.user.id);
    return ok(res, history);
  } catch (err) { next(err); }
}

async function getContributionHandler(req, res, next) {
  try {
    const { teamId } = req.params;
    const userId     = req.user.id;
    const stats      = await getTeamContribution({ userId, teamId });
    return ok(res, stats);
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
