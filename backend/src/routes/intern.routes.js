const express = require('express');
const router  = express.Router();
const { getInternDashboard } = require('../controllers/intern.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/dashboard', verifyToken, getInternDashboard);

module.exports = router;
