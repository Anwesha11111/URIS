const express = require('express');
const router = express.Router();
const { getScoreHistory } = require('../controllers/score.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/history/:internId', verifyToken, getScoreHistory);

module.exports = router;
