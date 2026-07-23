const express = require('express');
const router  = express.Router();
const {
  overrideScore,
  updateTaskStatus,
  getAdminOverview,
  getPendingUsers,
  approveUser,
  getAvailabilityDeadline,
  setAvailabilityDeadline,
  getFormReminderUrl,
  setFormReminderUrl,
  finishInternship,
  blockIP,
  unblockIP,
  listBlockedIPs,
  getLoginLogs,
  changeUserRole,
  getAllUsers,
  deleteIntern,
  updateIntern,
  rejectUser,
  updateUserHandler,
  assignInternTeam,
  resetUserPassword,
  sendCredentials,
  sendCredentialsBulk,
  previewOnboardingEmail,
  logOnboardingAction,
  getInternProfile,
} = require('../controllers/admin.controller');
const {
  getPrefill,
  getArchive,
  listAllArchives,
  updateArchive,
  regenerateQr,
  getWorkCategories,
} = require('../controllers/internshipArchive.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

const ADMIN_ROLES = [
  ROLES.CORE_ADMIN, 
  ROLES.TECHNICAL_LEAD, 
  ROLES.OPERATIONS_LEAD, 
  ROLES.RESEARCH_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
  ROLES.OBSERVER_TEAM_LEAD,
  ROLES.COLLABORATOR_LEAD
];

router.post('/override-score',          verifyToken, requireRole(...ADMIN_ROLES), validate(schemas.overrideScore),    overrideScore);
router.post('/task/status',             verifyToken, requireRole(...ADMIN_ROLES), validate(schemas.updateTaskStatus), updateTaskStatus);
router.get('/overview',                 verifyToken, requireRole(...ADMIN_ROLES),                                     getAdminOverview);
router.get('/pending-users',            verifyToken, requireRole(...ADMIN_ROLES),                                     getPendingUsers);
router.post('/approve-user',            verifyToken, requireRole(...ADMIN_ROLES),                                     approveUser);
router.post('/reject-user',             verifyToken, requireRole(...ADMIN_ROLES),                                     rejectUser);
router.get('/availability-deadline',    verifyToken,                                                                   getAvailabilityDeadline);
router.post('/availability-deadline',   verifyToken, requireRole(...ADMIN_ROLES),                                     setAvailabilityDeadline);
router.get('/form-reminder-url',        verifyToken,                                                                   getFormReminderUrl);
router.post('/form-reminder-url',       verifyToken, requireRole(...ADMIN_ROLES),                                     setFormReminderUrl);
router.post('/finish-internship',       verifyToken, requireRole(...ADMIN_ROLES), validate(schemas.finishInternshipWithArchive), finishInternship);
router.get('/internship-archives',      verifyToken, requireRole(...ADMIN_ROLES),                                     listAllArchives);
router.get('/internship-archive/categories', verifyToken, requireRole(...ADMIN_ROLES),                              getWorkCategories);
router.get('/internship-archive/prefill/:internId', verifyToken, requireRole(...ADMIN_ROLES),                      getPrefill);
router.get('/internship-archive/:internId', verifyToken, requireRole(...ADMIN_ROLES),                               getArchive);
router.put('/internship-archive/:internId', verifyToken, requireRole(...ADMIN_ROLES), validate(schemas.upsertInternshipArchive), updateArchive);
router.post('/internship-archive/:internId/regenerate-qr', verifyToken, requireRole(...ADMIN_ROLES), regenerateQr);
router.delete('/interns/:internId',     verifyToken, requireRole(ROLES.CORE_ADMIN),                                   deleteIntern);
router.patch('/interns/:internId',      verifyToken, requireRole(...ADMIN_ROLES),                                     updateIntern);
router.get('/interns/:internId/profile', verifyToken, requireRole(...ADMIN_ROLES),                                    getInternProfile);
router.patch('/interns/:internId/team', verifyToken, requireRole(ROLES.CORE_ADMIN), validate(schemas.assignInternTeam), assignInternTeam);

// ── Phase 2: Security & Governance (also exposed via /operational) ────────────
router.post('/block-ip',                verifyToken, requireRole(ROLES.CORE_ADMIN),                                   blockIP);
router.delete('/block-ip',              verifyToken, requireRole(ROLES.CORE_ADMIN),                                   unblockIP);
router.get('/blocked-ips',              verifyToken, requireRole(ROLES.CORE_ADMIN),                                   listBlockedIPs);
router.get('/login-logs',               verifyToken, requireRole(ROLES.CORE_ADMIN),                                   getLoginLogs);
router.post('/change-role',             verifyToken, requireRole(ROLES.CORE_ADMIN),                                   changeUserRole);
router.get('/users',                    verifyToken, requireRole(ROLES.CORE_ADMIN),                                   getAllUsers);
router.patch('/users/:userId',          verifyToken, requireRole(ROLES.CORE_ADMIN), validate(schemas.updateUser),     updateUserHandler);
router.post('/users/:userId/reset-password', verifyToken, requireRole(ROLES.CORE_ADMIN),                              resetUserPassword);

// ── Phase 5B: Onboarding Email & Credentials ──────────────────────────────────
router.post('/users/:userId/send-credentials', verifyToken, requireRole(ROLES.CORE_ADMIN),                            sendCredentials);
router.post('/users/bulk-send-credentials', verifyToken, requireRole(ROLES.CORE_ADMIN),                               sendCredentialsBulk);
router.get('/onboarding/preview-email', verifyToken, requireRole(ROLES.CORE_ADMIN),                                   previewOnboardingEmail);
router.post('/onboarding/log-action', verifyToken, requireRole(ROLES.CORE_ADMIN),                                     logOnboardingAction);

module.exports = router;
