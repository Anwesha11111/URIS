const { register, login } = require('../services/auth.service');
const { validateAuth }    = require('../utils/validate');
const { trackActivity }   = require('../utils/activityTracker');
const { logAction }       = require('../utils/auditLogger');
const { ACTIVITY_TYPES }  = require('../constants/activityTypes');
const { AUDIT_ACTIONS, AUDIT_ENTITIES } = require('../constants/auditActions');

/**
 * POST /auth/register
 */
async function registerUser(req, res, next) {
  try {
    const email    = typeof req.body.email    === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role     = typeof req.body.role     === 'string' ? req.body.role.trim() : 'intern';

    const errors = validateAuth({ email, password });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], data: null });
    }

    const user = await register({ email, password, role });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data:    user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 */
async function loginUser(req, res, next) {
  try {
    const email    = typeof req.body.email    === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const errors = validateAuth({ email, password });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], data: null });
    }

    const result = await login({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data:    result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 *
 * JWT is stateless — logout is client-side (clear the token).
 * This endpoint exists solely to record the logout event for activity tracking.
 * Requires a valid token so we know who is logging out.
 */
async function logoutUser(req, res) {
  const userId = req.user?.id;
  if (userId) {
    void trackActivity(userId, ACTIVITY_TYPES.LOGOUT);
    void logAction(userId, AUDIT_ACTIONS.LOGOUT, AUDIT_ENTITIES.USER, userId, {});
  }
  return res.status(200).json({ success: true, message: 'Logged out.', data: null });
}

/**
 * POST /auth/activity
 *
 * Called by the frontend to record a TASK_WORK or IDLE period.
 * Body: { type: 'TASK_WORK' | 'IDLE', duration: number (seconds) }
 */
async function recordActivity(req, res) {
  const userId   = req.user?.id;
  const { type, duration } = req.body;

  const allowed = [ACTIVITY_TYPES.TASK_WORK, ACTIVITY_TYPES.IDLE];
  if (!allowed.includes(type)) {
    return res.status(400).json({ success: false, message: `type must be one of: ${allowed.join(', ')}`, data: null });
  }
  if (typeof duration !== 'number' || duration < 0) {
    return res.status(400).json({ success: false, message: 'duration must be a non-negative number (seconds)', data: null });
  }

  void trackActivity(userId, type, Math.round(duration));
  return res.status(200).json({ success: true, message: 'Activity recorded.', data: null });
}

module.exports = { registerUser, loginUser, logoutUser, recordActivity };
