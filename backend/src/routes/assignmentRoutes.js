const express = require('express');
const router = express.Router();
const { getShortlist, assignTask } = require('../controllers/assignment.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.post('/shortlist', verifyToken, checkRole('ADMIN'), getShortlist);
router.post('/assign',    verifyToken, checkRole('ADMIN'), assignTask);

module.exports = router;
