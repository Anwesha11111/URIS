const express = require('express');
const router  = express.Router();
const { getCredibility, getMyCredibility } = require('../controllers/credibility.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/get',  verifyToken, checkRole('ADMIN'), getCredibility);
router.get('/mine', verifyToken, getMyCredibility);

module.exports = router;
