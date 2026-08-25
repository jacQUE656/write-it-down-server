const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const entries = require('../queries/entries');

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const entry = await entries.createEntry({ userEmail: req.user.email, ...req.body });
    res.status(201).json({ entry });
  } catch (err) {
    console.error('createEntry failed:', err.message);
    res.status(500).json({ error: 'Could not save entry. Please try again.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await entries.listEntries(req.user.email);
    res.json({ entries: list });
  } catch (err) {
    console.error('listEntries failed:', err.message);
    res.status(500).json({ error: 'Could not load entries.' });
  }
});

// NOTE: this must be declared before '/:date' or Express will treat
// "insights" as a date parameter and this route will never be reached.
router.get('/insights/recurring-gratitude', async (req, res) => {
  try {
    const results = await entries.recurringGratitude(req.user.email);
    res.json({ recurring: results });
  } catch (err) {
    console.error('recurringGratitude failed:', err.message);
    res.status(500).json({ error: 'Could not load gratitude insights.' });
  }
});

router.get('/:date', async (req, res) => {
  try {
    const detail = await entries.getEntryDetail(req.user.email, req.params.date);
    if (!detail) return res.status(404).json({ error: 'Entry not found' });
    res.json(detail);
  } catch (err) {
    console.error('getEntryDetail failed:', err.message);
    res.status(500).json({ error: 'Could not load entry.' });
  }
});

router.get('/:date/similar', async (req, res) => {
  try {
    const results = await entries.findSimilarDays(req.user.email, req.params.date);
    res.json({ similarDays: results });
  } catch (err) {
    console.error('findSimilarDays failed:', err.message);
    res.status(500).json({ error: 'Could not load similar days.' });
  }
});

router.get('/:date/mood-trend', async (req, res) => {
  try {
    const results = await entries.moodTrend(req.user.email, req.params.date);
    res.json({ trend: results });
  } catch (err) {
    console.error('moodTrend failed:', err.message);
    res.status(500).json({ error: 'Could not load mood trend.' });
  }
});

router.post('/:date/link', async (req, res) => {
  try {
    const { toDate } = req.body;
    if (!toDate) return res.status(400).json({ error: 'toDate is required' });
    await entries.linkEntries(req.user.email, req.params.date, toDate);
    res.json({ ok: true });
  } catch (err) {
    console.error('linkEntries failed:', err.message);
    res.status(500).json({ error: 'Could not link entries.' });
  }
});

module.exports = router;
