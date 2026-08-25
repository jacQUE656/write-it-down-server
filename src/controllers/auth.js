const { verifyGoogleToken, findOrCreateUser, issueSessionToken } = require('../auth/google');
const { signUp, logIn, issueSessionToken: issuePasswordSessionToken } = require('../auth/password');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function googleSignIn(req, res) {
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
}

async function handleSignUp(req, res) {
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
}

async function handleLogIn(req, res) {
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
}

function getMe(req, res) {
  res.json({ user: req.user });
}

function handleLogOut(req, res) {
  res.clearCookie('loom_session');
  res.json({ ok: true });
}

module.exports = {
  googleSignIn,
  handleSignUp,
  handleLogIn,
  getMe,
  handleLogOut,
};