const { getUserGraph } = require('../queries/graph');

async function getGraph(req, res) {
  try {
    const graph = await getUserGraph(req.user.email);
    res.json(graph);
  } catch (err) {
    console.error('getUserGraph failed:', err.message);
    res.status(500).json({ error: 'Could not load graph.' });
  }
}

module.exports = { getGraph };