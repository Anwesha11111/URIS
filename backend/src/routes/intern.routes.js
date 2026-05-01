const express = require('express');
const router  = express.Router();
const { getInternDashboard } = require('../controllers/intern.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// No body/params/query to validate — dashboard reads from req.user.id only
router.get('/dashboard', verifyToken, getInternDashboard);

module.exports = router;
