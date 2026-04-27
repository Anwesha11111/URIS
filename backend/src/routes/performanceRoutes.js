const express = require('express');
const router = express.Router();
const { getPerformance } = require('../controllers/performance.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/get/:internId', verifyToken, getPerformance);

module.exports = router;
