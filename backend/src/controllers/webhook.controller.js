'use strict';

/**
 * webhook.controller.js
 *
 * Handles incoming webhook events from:
 *   - Plane.so  (POST /webhooks/plane)
 *   - OpenProject (POST /webhooks/openproject)
 *
 * Plane events:
 *   issue.created — sync the new issue into the Task table
 *   issue.updated — sync the updated issue into the Task table
 *
 * OpenProject events:
 *   work_package:created — create/update matching URIS task
 *   work_package:updated — sync status/deadline/assignee changes
 *
 * All other event types are acknowledged with 200 and ignored.
 * The HMAC signature has already been verified by middleware before these handlers run.
 */

const logger = require('../utils/logger');
const { syncSingleIssueFromPlane } = require('../services/taskService');
const { syncInboundWorkPackage }   = require('../services/openproject.service');

// Events we act on — everything else is silently acknowledged
const HANDLED_PLANE_EVENTS = new Set(['issue.created', 'issue.updated']);

async function handlePlaneWebhook(req, res) {
  const { event, data } = req.body ?? {};

  // Acknowledge immediately — Plane has a short response timeout
  // We process asynchronously so the HTTP response is never delayed by DB work
  if (!HANDLED_PLANE_EVENTS.has(event)) {
    logger.debug({ event }, 'Plane webhook event ignored (not handled)');
    return res.status(200).json({ success: true, message: 'Event acknowledged (not handled)' });
  }

  const issueId = data?.id ?? data?.issue?.id;

  if (!issueId) {
    logger.warn({ event, body: req.body }, 'Plane webhook payload missing issue ID');
    return res.status(400).json({ success: false, message: 'Missing issue ID in webhook payload' });
  }

  // Respond immediately, then sync in the background
  res.status(200).json({ success: true, message: 'Webhook received' });

  // Fire-and-forget — errors are logged but never bubble up to the client
  // (response already sent above)
  setImmediate(async () => {
    logger.info({ event, issueId }, 'Processing Plane webhook event');
    const result = await syncSingleIssueFromPlane(issueId);
    if (result.error) {
      logger.error({ event, issueId, error: result.error }, 'Webhook sync failed');
    } else {
      logger.info({ event, issueId, synced: result.synced }, 'Webhook sync completed');
    }
  });
}

// ── OpenProject inbound webhook ───────────────────────────────────────────────

const HANDLED_OP_EVENTS = new Set(['work_package:created', 'work_package:updated']);

/**
 * handleOpenProjectWebhook — process inbound OpenProject webhook events.
 * Signature verified by verifyOPSignature middleware before this runs.
 */
async function handleOpenProjectWebhook(req, res) {
  const body  = req.body ?? {};
  // OP webhook payload shape: { action: 'work_package:updated', work_package: {...} }
  const event = body.action ?? body.event;
  const wpData = body.work_package ?? body.data;

  if (!HANDLED_OP_EVENTS.has(event)) {
    logger.debug({ event }, 'OpenProject webhook event ignored (not handled)');
    return res.status(200).json({ success: true, message: 'Event acknowledged (not handled)' });
  }

  if (!wpData?.id) {
    logger.warn({ event, body }, 'OpenProject webhook payload missing work_package id');
    return res.status(400).json({ success: false, message: 'Missing work_package id' });
  }

  // Respond immediately
  res.status(200).json({ success: true, message: 'OpenProject webhook received' });

  setImmediate(async () => {
    logger.info({ event, opId: wpData.id }, 'Processing OpenProject webhook event');
    const result = await syncInboundWorkPackage(wpData);
    if (result.error && result.error !== 'no matching task') {
      logger.warn({ event, opId: wpData.id, error: result.error }, 'OpenProject webhook sync failed');
    } else {
      logger.info({ event, opId: wpData.id, synced: result.synced, taskId: result.taskId }, 'OpenProject webhook sync completed');
    }
  });
}

module.exports = { handlePlaneWebhook, handleOpenProjectWebhook };
