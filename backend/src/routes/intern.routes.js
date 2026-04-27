const express = require('express');
const router = express.Router();
const { getInternDashboard } = require('../controllers/intern.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/dashboard', verifyToken, checkRole('INTERN'), getInternDashboard);

module.exports = router;
