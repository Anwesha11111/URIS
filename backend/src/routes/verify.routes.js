'use strict';

const express = require('express');
const router  = express.Router();
const { getVerification } = require('../controllers/verify.controller');

// Public — no auth required
router.get('/:verificationId', getVerification);

module.exports = router;
