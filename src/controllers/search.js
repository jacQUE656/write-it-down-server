const { searchAll } = require('../queries/search');

async function executeSearch(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });
    const results = await searchAll(req.user.email, q);
    res.json({ results });
  } catch (err) {
    console.error('searchAll failed:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}

module.exports = { executeSearch };