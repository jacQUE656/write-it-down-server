const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const entriesController = require('../controllers/entries');

router.use(requireAuth);

router.post('/', requireAuth, entriesController.createEntry);
router.get('/', requireAuth, entriesController.listEntries);
router.get('/insights/recurring-gratitude', requireAuth, entriesController.getRecurringGratitude);
router.get('/:date', requireAuth, entriesController.getEntryDetail);
router.get('/:date/similar', requireAuth, entriesController.findSimilarDays);
router.get('/:date/mood-trend', requireAuth, entriesController.getMoodTrend);
router.post('/:date/link', requireAuth, entriesController.linkEntries);

module.exports = router;