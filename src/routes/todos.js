// routes/todos.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/google');
const todos = require('../queries/todos');

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const { text, date } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const todo = await todos.quickAddTodo(req.user.email, text.trim(), entryDate);
    res.status(201).json({ todo });
  } catch (err) {
    console.error('quickAddTodo failed:', err.message);
    res.status(500).json({ error: 'Could not add todo.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await todos.listOpenTodos(req.user.email);
    res.json({ todos: list });
  } catch (err) {
    console.error('listOpenTodos failed:', err.message);
    res.status(500).json({ error: 'Could not load todos.' });
  }
});

router.get('/stalled', async (req, res) => {
  try {
    const list = await todos.stalledTodos(req.user.email);
    res.json({ stalled: list });
  } catch (err) {
    console.error('stalledTodos failed:', err.message);
    res.status(500).json({ error: 'Could not load stalled todos.' });
  }
});

router.patch('/', async (req, res) => {
  try {
    const { text, entryDate, done } = req.body;
    if (!text || !entryDate || typeof done !== 'boolean') {
      return res.status(400).json({ error: 'text, entryDate, and done are required' });
    }
    const todo = await todos.setTodoDone(req.user.email, text, entryDate, done);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ todo });
  } catch (err) {
    console.error('setTodoDone failed:', err.message);
    res.status(500).json({ error: 'Could not update todo.' });
  }
});

router.post('/block', async (req, res) => {
  try {
    const { blockedText, blockedDate, blockingText, blockingDate } = req.body;
    if (!blockedText || !blockedDate || !blockingText || !blockingDate) {
      return res.status(400).json({ error: 'blockedText, blockedDate, blockingText, and blockingDate are required' });
    }
    await todos.addBlocker(req.user.email, blockedText, blockedDate, blockingText, blockingDate);
    res.json({ ok: true });
  } catch (err) {
    console.error('addBlocker failed:', err.message);
    res.status(500).json({ error: 'Could not link todos.' });
  }
});

router.get('/shared-with-me', async (req, res) => {
  try {
    const list = await todos.listTodosSharedWithMe(req.user.email);
    res.json({ todos: list });
  } catch (err) {
    console.error('listTodosSharedWithMe failed:', err.message);
    res.status(500).json({ error: 'Could not load shared todos.' });
  }
});

router.post('/share', async (req, res) => {
  try {
    const { text, entryDate, email } = req.body;
    if (!text || !entryDate || !email) {
      return res.status(400).json({ error: 'text, entryDate, and email are required' });
    }
    const result = await todos.shareTodo(req.user.email, text, entryDate, email.trim().toLowerCase());
    res.json({ shared: result });
  } catch (err) {
    console.error('shareTodo failed:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not share todo.' });
  }
});

router.delete('/share', async (req, res) => {
  try {
    const { text, entryDate, email } = req.body;
    if (!text || !entryDate || !email) {
      return res.status(400).json({ error: 'text, entryDate, and email are required' });
    }
    await todos.unshareTodo(req.user.email, text, entryDate, email.trim().toLowerCase());
    res.json({ ok: true });
  } catch (err) {
    console.error('unshareTodo failed:', err.message);
    res.status(500).json({ error: 'Could not remove share.' });
  }
});

module.exports = router;
