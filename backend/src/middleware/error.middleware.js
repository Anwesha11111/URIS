/**
 * Global error handler.
 *
 * Security rules:
 *  - 4xx errors (client errors) return the error's own message — these are
 *    intentional, safe messages set by service/controller code.
 *  - 5xx errors (server errors) return a generic message — internal details
 *    (stack traces, DB errors, etc.) are logged server-side only, never sent
 *    to the client.
 *
 * Response shape always matches the rest of the API:
 *   { success: false, message: string, data: null }
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = typeof err.status === 'number' ? err.status : 500;
  const isClientError = status >= 400 && status < 500;

  // Always log the full error server-side for debugging
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}`, err);

  // Only expose the message for intentional client errors.
  // For server errors, return a generic message to avoid leaking internals.
  const message = isClientError
    ? (err.message || 'Bad request.')
    : 'An unexpected error occurred. Please try again later.';

  return res.status(status).json({
    success: false,
    message,
    data:    null,
  });
}

module.exports = { errorHandler };
