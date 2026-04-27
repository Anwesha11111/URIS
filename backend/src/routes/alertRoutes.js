const express = require('express');
const router  = express.Router();
const { getAlerts, resolveAlertById } = require('../controllers/alerts.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/',              verifyToken, checkRole('ADMIN'), getAlerts);
router.patch('/:id/resolve', verifyToken, checkRole('ADMIN'), resolveAlertById);

module.exports = router;
