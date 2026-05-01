const express = require('express');
const router  = express.Router();
const { getShortlist, assignTask } = require('../controllers/assignment.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

router.post('/shortlist',   verifyToken, requireRole(ROLES.ADMIN), validate(schemas.getShortlist), getShortlist);
router.post('/assign-task', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.assignTask),   assignTask);

module.exports = router;
