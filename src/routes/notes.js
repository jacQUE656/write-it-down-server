// routes/notes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const notes = require('../queries/notes');

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const { title, body, themes } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    const note = await notes.createNote({ userEmail: req.user.email, title, body, themes });
    res.status(201).json({ note });
  } catch (err) {
    console.error('createNote failed:', err.message);
    res.status(500).json({ error: 'Could not save note.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await notes.listNotes(req.user.email);
    res.json({ notes: list });
  } catch (err) {
    console.error('listNotes failed:', err.message);
    res.status(500).json({ error: 'Could not load notes.' });
  }
});

// NOTE: must be declared before '/:noteId' or Express treats "shared-with-me"
// as a noteId and this route is never reached.
router.get('/shared-with-me', async (req, res) => {
  try {
    const list = await notes.listNotesSharedWithMe(req.user.email);
    res.json({ notes: list });
  } catch (err) {
    console.error('listNotesSharedWithMe failed:', err.message);
    res.status(500).json({ error: 'Could not load shared notes.' });
  }
});

router.get('/:noteId', async (req, res) => {
  try {
    const detail = await notes.getNoteDetail(req.user.email, req.params.noteId);
    if (!detail) return res.status(404).json({ error: 'Note not found' });
    res.json(detail);
  } catch (err) {
    console.error('getNoteDetail failed:', err.message);
    res.status(500).json({ error: 'Could not load note.' });
  }
});

router.patch('/:noteId', async (req, res) => {
  try {
    const { title, body } = req.body;
    const note = await notes.updateNote(req.user.email, req.params.noteId, { title, body });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ note });
  } catch (err) {
    console.error('updateNote failed:', err.message);
    res.status(500).json({ error: 'Could not update note.' });
  }
});

router.get('/:noteId/related', async (req, res) => {
  try {
    const related = await notes.relatedNotes(req.user.email, req.params.noteId);
    res.json({ related });
  } catch (err) {
    console.error('relatedNotes failed:', err.message);
    res.status(500).json({ error: 'Could not load related notes.' });
  }
});

router.post('/:noteId/link', async (req, res) => {
  try {
    const { toNoteId } = req.body;
    if (!toNoteId) return res.status(400).json({ error: 'toNoteId is required' });
    await notes.linkNotes(req.user.email, req.params.noteId, toNoteId);
    res.json({ ok: true });
  } catch (err) {
    console.error('linkNotes failed:', err.message);
    res.status(500).json({ error: 'Could not link notes.' });
  }
});

router.post('/:noteId/reference-from-entry', async (req, res) => {
  try {
    const { entryDate } = req.body;
    if (!entryDate) return res.status(400).json({ error: 'entryDate is required' });
    await notes.referenceNoteFromEntry(req.user.email, entryDate, req.params.noteId);
    res.json({ ok: true });
  } catch (err) {
    console.error('referenceNoteFromEntry failed:', err.message);
    res.status(500).json({ error: 'Could not link entry to note.' });
  }
});

router.post('/:noteId/share', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const result = await notes.shareNote(req.user.email, req.params.noteId, email.trim().toLowerCase());
    res.json({ shared: result });
  } catch (err) {
    console.error('shareNote failed:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not share note.' });
  }
});

router.delete('/:noteId/share', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    await notes.unshareNote(req.user.email, req.params.noteId, email.trim().toLowerCase());
    res.json({ ok: true });
  } catch (err) {
    console.error('unshareNote failed:', err.message);
    res.status(500).json({ error: 'Could not remove share.' });
  }
});

module.exports = router;
