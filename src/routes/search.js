const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const searchController = require('../controllers/search');

router.get('/', requireAuth, searchController.executeSearch);

module.exports = router;