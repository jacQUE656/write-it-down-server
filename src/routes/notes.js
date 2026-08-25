const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const notesController = require('../controllers/notes');

router.use(requireAuth);

router.post('/',requireAuth, notesController.createNote);
router.get('/', requireAuth, notesController.listNotes);
router.get('/shared-with-me', requireAuth, notesController.listNotesSharedWithMe);
router.get('/:noteId', requireAuth, notesController.getNoteDetail);
router.patch('/:noteId', requireAuth, notesController.updateNote);
router.get('/:noteId/related', requireAuth, notesController.getRelatedNotes);
router.post('/:noteId/link', requireAuth, notesController.linkNotes);
router.post('/:noteId/reference-from-entry', requireAuth, notesController.referenceNoteFromEntry);
router.post('/:noteId/share', requireAuth, notesController.shareNote);
router.delete('/:noteId/share', requireAuth, notesController.unshareNote);
router.delete('/:noteId', requireAuth, notesController.deleteNote);

module.exports = router;