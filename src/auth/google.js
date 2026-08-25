const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { runQuery } = require('../db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID token and returns the decoded profile.
 * Throws if the token is invalid or expired.
 */
async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload(); // { sub, email, name, picture, ... }
}

/**
 * Finds an existing User node by googleId, or creates one on first sign-in.
 * Parameterised query — no string concatenation.
 */
async function findOrCreateUser(profile) {
  const cypher = `
    MERGE (u:User {googleId: $googleId})
    ON CREATE SET u.email = $email, u.name = $name, u.avatarUrl = $avatarUrl, u.createdAt = datetime()
    ON MATCH SET u.name = $name, u.avatarUrl = $avatarUrl
    RETURN u
  `;
  const records = await runQuery(cypher, {
    googleId: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  });
  return records[0].u.properties;
}

/** Issues a short-lived app session token (httpOnly cookie) after sign-in. */
function issueSessionToken(user) {
  return jwt.sign(
    { googleId: user.googleId, email: user.email, name: user.name },
    process.env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

/** Express middleware: reads the session cookie and attaches req.user. */
function requireAuth(req, res, next) {
  const token = req.cookies?.loom_session;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.user = jwt.verify(token, process.env.SESSION_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

module.exports = { verifyGoogleToken, findOrCreateUser, issueSessionToken, requireAuth };
