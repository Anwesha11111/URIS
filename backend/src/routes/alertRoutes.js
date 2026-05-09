const express = require('express');
const router  = express.Router();
const { getAlerts, resolveAlertById, resolveMyAlertById, getMyAnomalyAlerts } = require('../controllers/alerts.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

// Admin — all active alerts
router.get('/',              verifyToken, requireRole(ROLES.ADMIN), validate(schemas.getAlerts),    getAlerts);
router.patch('/:id/resolve', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.resolveAlert), resolveAlertById);

// Intern — their own alerts
router.get('/my',                verifyToken, validate(schemas.getAlerts),    getMyAnomalyAlerts);
router.patch('/my/:id/resolve',  verifyToken, validate(schemas.resolveAlert), resolveMyAlertById);

module.exports = router;
