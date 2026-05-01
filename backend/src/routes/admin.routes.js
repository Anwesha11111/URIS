const express = require('express');
const router  = express.Router();
const { overrideScore, updateTaskStatus, getAdminOverview } = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

router.post('/override-score', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.overrideScore),    overrideScore);
router.post('/task/status',    verifyToken, requireRole(ROLES.ADMIN), validate(schemas.updateTaskStatus), updateTaskStatus);
router.get('/overview',        verifyToken, requireRole(ROLES.ADMIN),                                     getAdminOverview);

module.exports = router;
