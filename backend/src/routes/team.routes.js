const express = require('express');
const router  = express.Router();
const {
  createTeamHandler,
  listTeamsHandler,
  getTeamHandler,
  joinTeamHandler,
  leaveTeamHandler,
  getMyTeamsHandler,
  getMyTeamHistoryHandler,
  getContributionHandler,
} = require('../controllers/team.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

// ── Public to all authenticated users ────────────────────────────────────────
router.get('/',                          verifyToken, listTeamsHandler);
router.get('/my',                        verifyToken, getMyTeamsHandler);
router.get('/my/history',                verifyToken, getMyTeamHistoryHandler);
router.get('/:teamId',                   verifyToken, getTeamHandler);
router.post('/:teamId/join',             verifyToken, joinTeamHandler);
router.post('/:teamId/leave',            verifyToken, leaveTeamHandler);
router.get('/:teamId/contribution',      verifyToken, getContributionHandler);

// ── Admin only ────────────────────────────────────────────────────────────────
router.post('/', verifyToken, requireRole(ROLES.ADMIN), createTeamHandler);

module.exports = router;
