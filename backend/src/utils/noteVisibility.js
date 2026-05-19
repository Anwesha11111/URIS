/**
 * noteVisibility.js — Phase 3, Feature 5
 *
 * Governance-safe note visibility helpers.
 *
 * Rules (backend-enforced, never frontend-only):
 *   CORE_ADMIN          → sees all notes
 *   TECHNICAL_LEAD      → sees notes on own-team tasks
 *   RESEARCH_LEAD       → sees notes on own-team tasks
 *   OPERATIONS_LEAD     → sees operational overview only (no private notes)
 *   OPERATIONS_PM       → sees operational overview only (no private notes)
 *   OBSERVER_TEAM_LEAD  → sees notes on observed tasks only
 *   COLLABORATOR_LEAD   → sees notes on collaborated tasks only
 *   INTERNS             → cannot see any operational notes
 *   ORENDA_MEMBER       → cannot see any operational notes
 *   PAST_EMPLOYEE       → cannot see any notes
 *
 * Usage:
 *   const { canSeeNotes, stripNotes } = require('../utils/noteVisibility');
 *
 *   if (!canSeeNotes(req.user.role)) {
 *     task = stripNotes(task);
 *   }
 */

'use strict';

const { ROLES } = require('../constants/roles');

/**
 * Roles that have full note visibility.
 * @type {Set<string>}
 */
const FULL_NOTE_ROLES = new Set([
  ROLES.CORE_ADMIN,
  ROLES.TECHNICAL_LEAD,
  ROLES.RESEARCH_LEAD,
  ROLES.COLLABORATOR_LEAD,
  ROLES.OBSERVER_TEAM_LEAD,
]);

/**
 * Roles that have operational-overview-only visibility.
 * They see task status, deadlines, workload — but NOT private notes or reviews.
 * @type {Set<string>}
 */
const OPERATIONAL_OVERVIEW_ROLES = new Set([
  ROLES.OPERATIONS_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
]);

/**
 * Returns true if the role can see private operational notes.
 *
 * @param {string} role
 * @returns {boolean}
 */
function canSeeNotes(role) {
  return FULL_NOTE_ROLES.has(role);
}

/**
 * Returns true if the role has operational-overview-only visibility.
 * These users see sanitized data — no private notes, no internal reviews.
 *
 * @param {string} role
 * @returns {boolean}
 */
function isOperationalOverviewOnly(role) {
  return OPERATIONAL_OVERVIEW_ROLES.has(role);
}

/**
 * Strips private note fields from a task object.
 * Returns a new object — does not mutate the original.
 *
 * Fields stripped:
 *   - note          (intern progress note)
 *   - pauseReason   (admin pause reason)
 *   - internalNotes (future field)
 *
 * @param {object} task
 * @returns {object}
 */
function stripNotes(task) {
  if (!task || typeof task !== 'object') return task;
  const { note, pauseReason, internalNotes, ...rest } = task;
  return rest;
}

/**
 * Strips private review fields from a review object.
 * Operations roles should not see qualitative review notes.
 *
 * @param {object} review
 * @returns {object}
 */
function stripReviewNotes(review) {
  if (!review || typeof review !== 'object') return review;
  const { reviewNotes, ...rest } = review;
  return rest;
}

/**
 * Apply note visibility rules to a list of tasks based on the requesting user's role.
 * Returns a new array — does not mutate originals.
 *
 * @param {object[]} tasks
 * @param {string}   role
 * @returns {object[]}
 */
function applyNoteVisibility(tasks, role) {
  if (!Array.isArray(tasks)) return tasks;
  if (canSeeNotes(role)) return tasks;
  return tasks.map(stripNotes);
}

module.exports = {
  canSeeNotes,
  isOperationalOverviewOnly,
  stripNotes,
  stripReviewNotes,
  applyNoteVisibility,
  FULL_NOTE_ROLES,
  OPERATIONAL_OVERVIEW_ROLES,
};
