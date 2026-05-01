const express = require('express');
const router = express.Router();
const { runDemo } = require('../controllers/demo.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.post('/run', verifyToken, requireRole(ROLES.ADMIN), runDemo);

module.exports = router;
