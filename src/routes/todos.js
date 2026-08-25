const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const todosController = require('../controllers/todos');

router.use(requireAuth);

router.post('/', requireAuth, todosController.quickAddTodo);
router.get('/', requireAuth, todosController.listOpenTodos);
router.get('/stalled', requireAuth, todosController.getStalledTodos);
router.patch('/', requireAuth, todosController.setTodoDone);
router.post('/block', requireAuth, todosController.addBlocker);
router.get('/shared-with-me', requireAuth, todosController.listTodosSharedWithMe);
router.post('/share', todosController.shareTodo);
router.delete('/share', todosController.unshareTodo);

module.exports = router;