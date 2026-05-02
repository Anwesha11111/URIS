const express = require('express');
const router  = express.Router();
const { submitReview } = require('../controllers/review.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

router.post('/submit', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.submitReview), submitReview);

module.exports = router;
