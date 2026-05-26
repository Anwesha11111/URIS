'use strict';

/**
 * opWebhookSignature.middleware.js
 *
 * Verifies the HMAC-SHA256 signature on incoming OpenProject webhook requests.
 *
 * OpenProject signs each request with the shared secret configured in the
 * webhook settings. The signature is sent in the `x-op-signature-256` header
 * as "sha256=<hex>".
 *
 * If OPENPROJECT_WEBHOOK_SECRET is not set, the middleware passes through
 * in development and rejects in production — matching the Plane pattern.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

function verifyOPSignature(req, res, next) {
  const secret = process.env.OPENPROJECT_WEBHOOK_SECRET;

  // In development without a secret configured, pass through with a warning
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('OPENPROJECT_WEBHOOK_SECRET not set — rejecting webhook');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }
    logger.warn('OPENPROJECT_WEBHOOK_SECRET not set — passing through (dev only)');
    // Parse raw body to JSON for the controller
    try {
      if (req.body instanceof Buffer) req.body = JSON.parse(req.body.toString('utf8'));
    } catch { /* ignore */ }
    return next();
  }

  const sigHeader = req.headers['x-op-signature-256'] ?? req.headers['x-openproject-signature'];
  if (!sigHeader) {
    logger.warn({ ip: req.ip }, 'OpenProject webhook missing signature header');
    return res.status(401).json({ success: false, message: 'Missing webhook signature' });
  }

  // Strip "sha256=" prefix if present
  const receivedHex = sigHeader.replace(/^sha256=/, '');

  const rawBody = req.body instanceof Buffer
    ? req.body
    : Buffer.from(JSON.stringify(req.body));

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  let valid = false;
  try {
    valid = crypto.timingSafeEqual(
      Buffer.from(receivedHex, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    logger.warn({ ip: req.ip }, 'OpenProject webhook signature verification failed');
    return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
  }

  // Parse raw body for the controller
  try {
    if (req.body instanceof Buffer) req.body = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
  }

  next();
}

module.exports = { verifyOPSignature };
