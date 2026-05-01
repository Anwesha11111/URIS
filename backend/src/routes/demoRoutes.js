const express = require('express');
const router = express.Router();
const { runDemo } = require('../controllers/demo.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate }                 = require('../middleware/validate.middleware');
const { schemas }                  = require('../validation/schemas');
const { ROLES } = require('../constants/roles');

router.post('/run', verifyToken, requireRole(ROLES.ADMIN), validate(schemas.runDemo), runDemo);

module.exports = router;
