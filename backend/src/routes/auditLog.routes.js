const express = require('express');
const router  = express.Router();
const { getAuditLogs } = require('../controllers/auditLog.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

// Admin-only — interns must never see the audit trail
router.get('/', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.getAuditLogs), getAuditLogs);

module.exports = router;
