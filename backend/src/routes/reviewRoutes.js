const express = require('express');
const router  = express.Router();
const { submitReview } = require('../controllers/review.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.post('/submit', verifyToken, requireRole(ROLES.ADMIN), submitReview);

module.exports = router;
