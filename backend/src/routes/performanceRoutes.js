const express = require('express');
const router = express.Router();
const { getPerformance } = require('../controllers/performance.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

// Admin — can fetch any intern's performance by ID
router.get('/get/:internId', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.getPerformance), getPerformance);

// Intern — can only fetch their own performance (internId resolved from JWT in controller)
router.get('/mine', verifyToken, requireRole(ROLES.INTERN), getPerformance);

module.exports = router;
