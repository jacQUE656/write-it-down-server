const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const entriesController = require('../controllers/entries');

router.use(requireAuth);

router.post('/', entriesController.createEntry);
router.get('/', entriesController.listEntries);
router.get('/insights/recurring-gratitude', entriesController.getRecurringGratitude);
router.get('/:date', entriesController.getEntryDetail);
router.get('/:date/similar', entriesController.findSimilarDays);
router.get('/:date/mood-trend', entriesController.getMoodTrend);
router.post('/:date/link', entriesController.linkEntries);

module.exports = router;