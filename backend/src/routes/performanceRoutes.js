const express = require('express');
const router = express.Router();
const { getPerformance } = require('../controllers/performance.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');

router.get('/get/:internId', verifyToken, validate(schemas.getPerformance), getPerformance);

module.exports = router;
