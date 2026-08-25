const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const graphController = require('../controllers/graph');

router.get('/', requireAuth, graphController.getGraph);

module.exports = router;