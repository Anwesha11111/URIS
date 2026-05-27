const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { submitDocument, getDocumentsForIntern, getDocumentsForLead } = require('../controllers/document.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

const CAN_SUBMIT_DOCUMENT = [
  ROLES.TECHNICAL_INTERN,
  ROLES.OPERATIONS_INTERN,
  ROLES.RESEARCH_INTERN
];

const CAN_VIEW_DOCUMENTS = [
  ROLES.CORE_ADMIN,
  ROLES.TECHNICAL_LEAD,
  ROLES.OPERATIONS_LEAD,
  ROLES.RESEARCH_LEAD,
  ROLES.OPERATIONS_PROGRAM_MANAGER,
  ROLES.OBSERVER_TEAM_LEAD,
  ROLES.COLLABORATOR_LEAD
];

// Multer: memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 + 1 },
});

// Interns submit documents
router.post('/submit', verifyToken, requireRole(...CAN_SUBMIT_DOCUMENT), upload.single('document'), validate(schemas.submitDocument), submitDocument);

// Leads view documents for their interns
router.get('/lead/:internId', verifyToken, requireRole(...CAN_VIEW_DOCUMENTS), getDocumentsForLead);

// Interns view their own documents
router.get('/mine', verifyToken, getDocumentsForIntern);

module.exports = router;
