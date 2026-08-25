// routes/graph.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const { getUserGraph } = require('../queries/graph');

router.get('/', requireAuth, async (req, res) => {
  try {
    const graph = await getUserGraph(req.user.email);
    res.json(graph);
  } catch (err) {
    console.error('getUserGraph failed:', err.message);
    res.status(500).json({ error: 'Could not load graph.' });
  }
});

module.exports = router;
