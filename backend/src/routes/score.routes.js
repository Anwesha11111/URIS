const express = require('express');
const router = express.Router();
const { getScoreHistory } = require('../controllers/score.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');

router.get('/history/:internId', verifyToken, validate(schemas.getScoreHistory), getScoreHistory);

module.exports = router;
