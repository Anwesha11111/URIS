'use strict';

/**
 * webhook.routes.js
 *
 * POST /webhooks/plane        — Plane.so issue events
 * POST /webhooks/openproject  — OpenProject work_package events
 *
 * Both routes use express.raw() so the raw body bytes are available for
 * HMAC-SHA256 signature verification before JSON parsing.
 *
 * These routes must be registered in app.js BEFORE the global express.json()
 * middleware, or the raw body will already be consumed and signature
 * verification will fail.
 */

const express  = require('express');
const router   = express.Router();
const { verifyPlaneSignature } = require('../middleware/webhookSignature.middleware');
const { verifyOPSignature }    = require('../middleware/opWebhookSignature.middleware');
const { handlePlaneWebhook, handleOpenProjectWebhook } = require('../controllers/webhook.controller');

router.post(
  '/plane',
  express.raw({ type: 'application/json' }),
  verifyPlaneSignature,
  handlePlaneWebhook
);

router.post(
  '/openproject',
  express.raw({ type: 'application/json' }),
  verifyOPSignature,
  handleOpenProjectWebhook
);

module.exports = router;
