const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const todosController = require('../controllers/todos');

router.use(requireAuth);

router.post('/', todosController.quickAddTodo);
router.get('/', todosController.listOpenTodos);
router.get('/stalled', todosController.getStalledTodos);
router.patch('/', todosController.setTodoDone);
router.post('/block', todosController.addBlocker);
router.get('/shared-with-me', todosController.listTodosSharedWithMe);
router.post('/share', todosController.shareTodo);
router.delete('/share', todosController.unshareTodo);

module.exports = router;