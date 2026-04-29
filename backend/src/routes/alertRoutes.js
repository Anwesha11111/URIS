const express = require('express');
const router  = express.Router();
const { getAlerts, resolveAlertById, getMyAnomalyAlerts } = require('../controllers/alerts.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

// Admin — all active alerts
router.get('/',              verifyToken, requireRole(ROLES.ADMIN), getAlerts);
router.patch('/:id/resolve', verifyToken, requireRole(ROLES.ADMIN), resolveAlertById);

// Intern — their own anomaly alerts only
router.get('/my', verifyToken, getMyAnomalyAlerts);

module.exports = router;
