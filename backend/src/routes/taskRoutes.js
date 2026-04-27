const express = require('express');
const router  = express.Router();
const { getTasksOverview, getTasks, createTask } = require('../controllers/tasks.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/overview', verifyToken, checkRole('ADMIN'), getTasksOverview);
router.get('/',         verifyToken, getTasks);
router.post('/create',  verifyToken, checkRole('ADMIN'), createTask);

module.exports = router;

console.log('Task routes loaded');
