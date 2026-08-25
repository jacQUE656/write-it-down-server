const notes = require('../queries/notes');

async function createNote(req, res) {
  try {
    const { title, body, themes } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    const note = await notes.createNote({ userEmail: req.user.email, title, body, themes });
    res.status(201).json({ note });
  } catch (err) {
    console.error('createNote failed:', err.message);
    res.status(500).json({ error: 'Could not save note.' });
  }
}

async function listNotes(req, res) {
  try {
    const list = await notes.listNotes(req.user.email);
    res.json({ notes: list });
  } catch (err) {
    console.error('listNotes failed:', err.message);
    res.status(500).json({ error: 'Could not load notes.' });
  }
}

async function listNotesSharedWithMe(req, res) {
  try {
    const list = await notes.listNotesSharedWithMe(req.user.email);
    res.json({ notes: list });
  } catch (err) {
    console.error('listNotesSharedWithMe failed:', err.message);
    res.status(500).json({ error: 'Could not load shared notes.' });
  }
}

async function getNoteDetail(req, res) {
  try {
    const detail = await notes.getNoteDetail(req.user.email, req.params.noteId);
    if (!detail) return res.status(404).json({ error: 'Note not found' });
    res.json(detail);
  } catch (err) {
    console.error('getNoteDetail failed:', err.message);
    res.status(500).json({ error: 'Could not load note.' });
  }
}

async function updateNote(req, res) {
  try {
    const { title, body } = req.body;
    const note = await notes.updateNote(req.user.email, req.params.noteId, { title, body });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ note });
  } catch (err) {
    console.error('updateNote failed:', err.message);
    res.status(500).json({ error: 'Could not update note.' });
  }
}

async function getRelatedNotes(req, res) {
  try {
    const related = await notes.relatedNotes(req.user.email, req.params.noteId);
    res.json({ related });
  } catch (err) {
    console.error('relatedNotes failed:', err.message);
    res.status(500).json({ error: 'Could not load related notes.' });
  }
}

async function linkNotes(req, res) {
  try {
    const { toNoteId } = req.body;
    if (!toNoteId) return res.status(400).json({ error: 'toNoteId is required' });
    await notes.linkNotes(req.user.email, req.params.noteId, toNoteId);
    res.json({ ok: true });
  } catch (err) {
    console.error('linkNotes failed:', err.message);
    res.status(500).json({ error: 'Could not link notes.' });
  }
}

async function referenceNoteFromEntry(req, res) {
  try {
    const { entryDate } = req.body;
    if (!entryDate) return res.status(400).json({ error: 'entryDate is required' });
    await notes.referenceNoteFromEntry(req.user.email, entryDate, req.params.noteId);
    res.json({ ok: true });
  } catch (err) {
    console.error('referenceNoteFromEntry failed:', err.message);
    res.status(500).json({ error: 'Could not link entry to note.' });
  }
}

async function shareNote(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const result = await notes.shareNote(req.user.email, req.params.noteId, email.trim().toLowerCase());
    res.json({ shared: result });
  } catch (err) {
    console.error('shareNote failed:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not share note.' });
  }
}

async function unshareNote(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    await notes.unshareNote(req.user.email, req.params.noteId, email.trim().toLowerCase());
    res.json({ ok: true });
  } catch (err) {
    console.error('unshareNote failed:', err.message);
    res.status(500).json({ error: 'Could not remove share.' });
  }
}

module.exports = {
  createNote,
  listNotes,
  listNotesSharedWithMe,
  getNoteDetail,
  updateNote,
  getRelatedNotes,
  linkNotes,
  referenceNoteFromEntry,
  shareNote,
  unshareNote,
};