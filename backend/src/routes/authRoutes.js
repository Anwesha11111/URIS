const express = require('express');
const router  = express.Router();
const { registerUser, loginUser, logoutUser, recordActivity } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/login',    loginUser);
router.post('/logout',   verifyToken, logoutUser);    // records logout activity
router.post('/activity', verifyToken, recordActivity); // records TASK_WORK / IDLE

module.exports = router;
