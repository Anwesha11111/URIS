const express = require('express');
const router = express.Router();
const { submitAvailability, getAvailability } = require('../controllers/availability.controller');

const { verifyToken } = require('../middleware/auth.middleware');

router.post('/submit', verifyToken, submitAvailability);
router.get('/:internId/:weekStart', verifyToken, getAvailability);

module.exports = router;
