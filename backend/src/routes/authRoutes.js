const express = require('express');
const router  = express.Router();
const { registerUser, loginUser, logoutUser, recordActivity } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { schemas }     = require('../validation/schemas');

router.post('/register', validate(schemas.register),         registerUser);
router.post('/login',    validate(schemas.login),            loginUser);
router.post('/logout',   verifyToken,                        logoutUser);    // no body to validate
router.post('/activity', verifyToken, validate(schemas.recordActivity), recordActivity);

module.exports = router;
