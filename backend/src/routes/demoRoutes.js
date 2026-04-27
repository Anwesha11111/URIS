const express = require('express');
const router = express.Router();
const { runDemo } = require('../controllers/demo.controller');

router.post('/run', runDemo);

module.exports = router;
