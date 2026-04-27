const express = require('express');
const router = express.Router();
const { overrideScore, updateTaskStatus, getAdminOverview } = require('../controllers/admin.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.post('/override-score', verifyToken, checkRole('ADMIN'), overrideScore);
router.post('/task/status',   verifyToken, checkRole('ADMIN'), updateTaskStatus);
router.get('/overview',       verifyToken, checkRole('ADMIN'), getAdminOverview);

module.exports = router;
