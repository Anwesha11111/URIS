const express = require('express');
const router = express.Router();
const { submitAvailability, getAvailability } = require('../controllers/availability.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');

router.post('/submit',              verifyToken, validate(schemas.submitAvailability), submitAvailability);
router.get('/:internId/:weekStart', verifyToken, validate(schemas.getAvailability),   getAvailability);

module.exports = router;
