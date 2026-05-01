/**
 * respond.js — Centralised HTTP response helpers.
 *
 * Every response in the system goes through one of these functions.
 * This guarantees a consistent shape regardless of which controller,
 * middleware, or service produces the response.
 *
 * Success shape:
 *   { success: true,  data: any,  message: string }
 *
 * Error shape:
 *   { success: false, error: ERROR_CODE, message: string, data: null }
 *
 * Error codes (machine-readable, safe to expose to clients):
 *   VALIDATION_ERROR   — malformed or out-of-range input (400)
 *   BUSINESS_RULE_ERROR — logically invalid input (400/409/422)
 *   AUTH_ERROR         — missing or invalid token (401)
 *   FORBIDDEN          — authenticated but insufficient permissions (403)
 *   NOT_FOUND          — requested resource does not exist (404)
 *   CONFLICT           — duplicate or conflicting resource (409)
 *   UNPROCESSABLE      — semantically invalid request (422)
 *   SERVER_ERROR       — unexpected internal error (500)
 *
 * Internal details (stack traces, DB errors, raw Joi paths) are NEVER
 * included in any response — they are logged server-side only.
 */

'use strict';

// ── Error code constants ───────────────────────────────────────────────────────

const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR:    'VALIDATION_ERROR',
  BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
  AUTH_ERROR:          'AUTH_ERROR',
  FORBIDDEN:           'FORBIDDEN',
  NOT_FOUND:           'NOT_FOUND',
  CONFLICT:            'CONFLICT',
  UNPROCESSABLE:       'UNPROCESSABLE',
  SERVER_ERROR:        'SERVER_ERROR',
});

// ── Response builders ──────────────────────────────────────────────────────────

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {any}    data
 * @param {string} [message]
 * @param {number} [status=200]
 */
function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send a created (201) response.
 *
 * @param {import('express').Response} res
 * @param {any}    data
 * @param {string} [message]
 */
function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

/**
 * Send a validation error response (400).
 * Used by Joi schema failures and format checks.
 *
 * @param {import('express').Response} res
 * @param {string} message  — human-readable, safe to expose
 */
function validationError(res, message) {
  return res.status(400).json({
    success: false,
    error:   ERROR_CODES.VALIDATION_ERROR,
    message,
    data:    null,
  });
}

/**
 * Send a business rule error response.
 * Status is determined by the rule (400 / 409 / 422).
 *
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 */
function businessError(res, status, message) {
  // Map HTTP status to the most specific error code
  const errorCode =
    status === 409 ? ERROR_CODES.CONFLICT :
    status === 422 ? ERROR_CODES.UNPROCESSABLE :
    status === 404 ? ERROR_CODES.NOT_FOUND :
    ERROR_CODES.BUSINESS_RULE_ERROR;

  return res.status(status).json({
    success: false,
    error:   errorCode,
    message,
    data:    null,
  });
}

/**
 * Send an authentication error (401).
 *
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function authError(res, message = 'Access denied. No token provided.') {
  return res.status(401).json({
    success: false,
    error:   ERROR_CODES.AUTH_ERROR,
    message,
    data:    null,
  });
}

/**
 * Send a forbidden error (403).
 *
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function forbidden(res, message = 'Access denied. Insufficient permissions.') {
  return res.status(403).json({
    success: false,
    error:   ERROR_CODES.FORBIDDEN,
    message,
    data:    null,
  });
}

/**
 * Send a not-found error (404).
 *
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function notFound(res, message = 'Resource not found.') {
  return res.status(404).json({
    success: false,
    error:   ERROR_CODES.NOT_FOUND,
    message,
    data:    null,
  });
}

/**
 * Send a conflict error (409).
 *
 * @param {import('express').Response} res
 * @param {string} message
 */
function conflict(res, message) {
  return res.status(409).json({
    success: false,
    error:   ERROR_CODES.CONFLICT,
    message,
    data:    null,
  });
}

module.exports = {
  ERROR_CODES,
  ok,
  created,
  validationError,
  businessError,
  authError,
  forbidden,
  notFound,
  conflict,
};
