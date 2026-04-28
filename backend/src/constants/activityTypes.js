/**
 * Activity type constants.
 *
 * Used in the Activity model to categorise what kind of event occurred.
 * Point-in-time events (LOGIN, LOGOUT) have no duration.
 * Duration events (TASK_WORK, IDLE) carry a duration in seconds.
 *
 * Adding a new type: add it here, then call trackActivity() at the relevant
 * point in the codebase.
 */

const ACTIVITY_TYPES = Object.freeze({
  LOGIN:     'LOGIN',      // user authenticated — point-in-time
  LOGOUT:    'LOGOUT',     // user signed out — point-in-time
  TASK_WORK: 'TASK_WORK',  // active time spent on a task — has duration
  IDLE:      'IDLE',       // inactivity period detected — has duration
});

module.exports = { ACTIVITY_TYPES };
