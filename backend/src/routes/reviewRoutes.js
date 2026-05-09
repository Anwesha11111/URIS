const express = require('express');
const router  = express.Router();
const { submitReview, getMyReviews, getReviewForTask, getReviewedTaskIds } = require('../controllers/review.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

// Admin — submit a review for a completed task
router.post('/submit',        verifyToken, requireRole(ROLES.ADMIN), validate(schemas.submitReview), submitReview);
// Admin — get all reviewed task IDs (for filtering the dropdown)
router.get('/all-task-ids',   verifyToken, requireRole(ROLES.ADMIN), getReviewedTaskIds);

// Intern — view all their own reviews
router.get('/mine',           verifyToken, requireRole(ROLES.INTERN), getMyReviews);
// Intern — view review for a specific task
router.get('/task/:taskId',   verifyToken, requireRole(ROLES.INTERN), getReviewForTask);

module.exports = router;
