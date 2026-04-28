const express = require('express');
const router  = express.Router();
const { getCredibility, getMyCredibility } = require('../controllers/credibility.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.get('/get',  verifyToken, requireRole(ROLES.ADMIN), getCredibility);
router.get('/mine', verifyToken, getMyCredibility);

module.exports = router;
