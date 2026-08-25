const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { runQuery } = require('../db');

const SALT_ROUNDS = 12;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function signUp({ email, password, name }) {
  if (!isValidEmail(email)) throw new Error('Invalid email address');
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await runQuery(
    `MATCH (u:User {email: $email}) RETURN u LIMIT 1`,
    { email }
  );
  if (existing.length > 0) throw new Error('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const records = await runQuery(
    `
    CREATE (u:User {
      email: $email,
      name: $name,
      passwordHash: $passwordHash,
      authProvider: 'password',
      createdAt: datetime()
    })
    RETURN u
    `,
    { email, name: name || email.split('@')[0], passwordHash }
  );
  return records[0].u.properties;
}

async function logIn({ email, password }) {
  const records = await runQuery(
    `MATCH (u:User {email: $email}) RETURN u LIMIT 1`,
    { email }
  );

  const genericError = new Error('Invalid email or password');

  if (records.length === 0) throw genericError;
  const user = records[0].u.properties;

  if (user.authProvider !== 'password' || !user.passwordHash) {
    // This account was created via Google Sign-In and has no password set.
    throw new Error('This account uses Google Sign-In. Please continue with Google.');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw genericError;

  return user;
}

/** Issues the same session token shape used by Google sign-in, so both flows are interchangeable. */
function issueSessionToken(user) {
  return jwt.sign(
    { email: user.email, name: user.name },
    process.env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { signUp, logIn, issueSessionToken };
