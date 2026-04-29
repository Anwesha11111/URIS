const express = require('express');
const router  = express.Router();
const { overrideScore, updateTaskStatus, getAdminOverview } = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.post('/override-score', verifyToken, requireRole(ROLES.ADMIN), overrideScore);
router.post('/task/status',    verifyToken, requireRole(ROLES.ADMIN), updateTaskStatus);
router.get('/overview',        verifyToken, requireRole(ROLES.ADMIN), getAdminOverview);

module.exports = router;
