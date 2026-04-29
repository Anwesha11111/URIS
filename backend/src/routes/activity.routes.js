const express = require('express');
const router  = express.Router();
const { getActivitySummary } = require('../controllers/activity.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Any authenticated user can fetch their own summary.
// Admins can pass ?userId= to fetch another user's summary (enforced in controller).
router.get('/summary', verifyToken, getActivitySummary);

module.exports = router;
