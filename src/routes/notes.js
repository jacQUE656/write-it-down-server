const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const notesController = require('../controllers/notes');

router.use(requireAuth);

router.post('/', notesController.createNote);
router.get('/', notesController.listNotes);
router.get('/shared-with-me', notesController.listNotesSharedWithMe);
router.get('/:noteId', notesController.getNoteDetail);
router.patch('/:noteId', notesController.updateNote);
router.get('/:noteId/related', notesController.getRelatedNotes);
router.post('/:noteId/link', notesController.linkNotes);
router.post('/:noteId/reference-from-entry', notesController.referenceNoteFromEntry);
router.post('/:noteId/share', notesController.shareNote);
router.delete('/:noteId/share', notesController.unshareNote);

module.exports = router;