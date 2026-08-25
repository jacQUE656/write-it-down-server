const express = require('express');
const router = express.Router();
const { verifyGoogleToken, findOrCreateUser, issueSessionToken, requireAuth } = require('../auth/google');
const { signUp, logIn, issueSessionToken: issuePasswordSessionToken } = require('../auth/password');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /auth/google  { idToken }  — called after Google Identity Services sign-in on the frontend
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    const profile = await verifyGoogleToken(idToken);
    const user = await findOrCreateUser(profile);
    const sessionToken = issueSessionToken(user);

    res.cookie('loom_session', sessionToken, COOKIE_OPTIONS);
    res.json({ user: { email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Google sign-in failed:', err.message);
    res.status(401).json({ error: 'Sign-in failed. Please try again.' });
  }
});

// POST /auth/signup  { email, password, name }
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await signUp({ email, password, name });
    const sessionToken = issuePasswordSessionToken(user);

    res.cookie('loom_session', sessionToken, COOKIE_OPTIONS);
    res.status(201).json({ user: { email: user.email, name: user.name } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await logIn({ email, password });
    const sessionToken = issuePasswordSessionToken(user);

    res.cookie('loom_session', sessionToken, COOKIE_OPTIONS);
    res.json({ user: { email: user.email, name: user.name } });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /auth/me — returns the currently signed-in user, if any
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('loom_session');
  res.json({ ok: true });
});

module.exports = router;
