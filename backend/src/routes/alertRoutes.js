const express = require('express');
const router  = express.Router();
const { getAlerts, resolveAlertById, getMyAnomalyAlerts } = require('../controllers/alerts.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

// Admin — all active alerts
router.get('/',              verifyToken, requireRole(ROLES.ADMIN), validate(schemas.getAlerts),    getAlerts);
router.patch('/:id/resolve', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.resolveAlert), resolveAlertById);

// Intern — their own anomaly alerts only
router.get('/my', verifyToken, validate(schemas.getAlerts), getMyAnomalyAlerts);

module.exports = router;
