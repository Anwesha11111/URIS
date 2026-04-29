const express = require('express');
const router  = express.Router();
const { getInternDashboard } = require('../controllers/intern.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.get('/dashboard', verifyToken, requireRole(ROLES.INTERN), getInternDashboard);

module.exports = router;
