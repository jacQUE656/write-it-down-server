const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { runQuery } = require('../db');

const SALT_ROUNDS = 12;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeUser(userProps) {
  const { passwordHash, ...safeUser } = userProps;
  return safeUser;
}

async function signUp({ email, password, name }) {
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!isValidEmail(normalizedEmail)) throw new Error('Invalid email address');
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await runQuery(
    `MATCH (u:User {email: $email}) RETURN u LIMIT 1`,
    { email: normalizedEmail }
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
    { 
      email: normalizedEmail, 
      name: name ? name.trim() : normalizedEmail.split('@')[0], 
      passwordHash 
    }
  );

  return sanitizeUser(records[0].u.properties);
}

async function logIn({ email, password }) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const genericError = new Error('Invalid email or password');

  const records = await runQuery(
    `MATCH (u:User {email: $email}) RETURN u LIMIT 1`,
    { email: normalizedEmail }
  );

  if (records.length === 0) throw genericError;
  const user = records[0].u.properties;

  if (user.authProvider !== 'password' || !user.passwordHash) {
    throw new Error('This account uses Google Sign-In. Please continue with Google.');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw genericError;

  return sanitizeUser(user);
}

/** Issues the same session token shape used by Google sign-in. */
function issueSessionToken(user) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured in environment variables.');
  }

  return jwt.sign(
    { email: user.email, name: user.name },
    secret,
    { expiresIn: '7d' }
  );
}

module.exports = { signUp, logIn, issueSessionToken };