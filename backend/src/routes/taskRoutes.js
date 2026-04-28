const express = require('express');
const router  = express.Router();
const { getTasksOverview, getTasks, createTask } = require('../controllers/tasks.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

router.get('/overview', verifyToken, requireRole(ROLES.ADMIN), getTasksOverview);
router.get('/',         verifyToken, getTasks);
router.post('/create',  verifyToken, requireRole(ROLES.ADMIN), createTask);

module.exports = router;
