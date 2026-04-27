const express = require('express');
const router = express.Router();
const { submitReview } = require('../controllers/review.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.post('/submit', verifyToken, checkRole('ADMIN'), submitReview);

module.exports = router;
