const express = require('express');
const router  = express.Router();
const { getActivitySummary } = require('../controllers/activity.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');

// Any authenticated user can fetch their own summary.
// Admins can pass ?userId= to fetch another user's summary (enforced in controller).
router.get('/summary', verifyToken, validate(schemas.getActivitySummary), getActivitySummary);

module.exports = router;
