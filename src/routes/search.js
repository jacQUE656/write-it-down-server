// routes/search.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const { searchAll } = require('../queries/search');

router.get('/', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });
    const results = await searchAll(req.user.email, q);
    res.json({ results });
  } catch (err) {
    console.error('searchAll failed:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

module.exports = router;
