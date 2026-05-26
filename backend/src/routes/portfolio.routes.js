'use strict';

const express = require('express');
const router  = express.Router();
const { getPublicPortfolio, getMyPortfolio, updateMyPortfolio } = require('../controllers/portfolio.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Authenticated intern routes — must come BEFORE /:slug to avoid conflict
router.get('/me',    verifyToken, getMyPortfolio);
router.patch('/me',  verifyToken, updateMyPortfolio);

// Public access — no auth required
router.get('/:slug', getPublicPortfolio);

module.exports = router;
