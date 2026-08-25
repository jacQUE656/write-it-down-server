require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { verifyConnection } = require('./db');

const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const todoRoutes = require('./routes/todos');
const noteRoutes = require('./routes/notes');
const graphRoutes = require('./routes/graph');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', async (req, res) => {
  try {
    await verifyConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable', message: err.message });
  }
});

app.use('/auth', authRoutes);
app.use('/entries', entryRoutes);
app.use('/todos', todoRoutes);
app.use('/notes', noteRoutes);
app.use('/graph', graphRoutes);
app.use('/search', searchRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function start() {
  try {
    await verifyConnection();
    console.log('Connected to CognoDB.');
  } catch (err) {
    console.error('Could not connect to CognoDB at startup:', err.message);
    console.error('Check COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD in your .env file.');
  }
  app.listen(PORT, () => console.log(`write it server running on http://localhost:${PORT}`));
}

start();