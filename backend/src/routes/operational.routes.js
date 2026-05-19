/**
 * operational.routes.js — Phase 3, Feature 6
 *
 * Sanitized operational overview endpoints.
 * Accessible by operations roles — returns no private notes or reviews.
 *
 * GET /operational/overview
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { getOperationalOverview } = require('../controllers/operational.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

const OPERATIONAL_ROLES = [
  ROLES.CORE_ADMIN,
  ROLES.OPERATIONS_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
  ROLES.TECHNICAL_LEAD,
  ROLES.RESEARCH_LEAD,
];

router.get('/overview', verifyToken, requireRole(...OPERATIONAL_ROLES), getOperationalOverview);

module.exports = router;
