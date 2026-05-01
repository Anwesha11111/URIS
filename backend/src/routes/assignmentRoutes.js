const express = require('express');
const router  = express.Router();
const { getShortlist, assignTask } = require('../controllers/assignment.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.post('/shortlist',   verifyToken, requireRole(ROLES.ADMIN), getShortlist);
router.post('/assign-task', verifyToken, requireRole(ROLES.ADMIN), assignTask);

module.exports = router;
