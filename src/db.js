require('dotenv').config();
const neo4j = require('neo4j-driver');

const { COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD } = process.env;

if (!COGNODB_URI || !COGNODB_USER || !COGNODB_PASSWORD) {
  throw new Error(
    'Missing CognoDB connection details. Make sure COGNODB_URI, COGNODB_USER, ' +
    'and COGNODB_PASSWORD are set in your .env file (see .env.example).'
  );
}

const driver = neo4j.driver(
  COGNODB_URI,
  neo4j.auth.basic(COGNODB_USER, COGNODB_PASSWORD)
);

/**
 * Runs a Cypher query with parameters against CognoDB and returns the records.
 * Always opens and closes its own session so connections don't leak.
 *
 * @param {string} cypher - parameterised Cypher query (never string-concatenated)
 * @param {object} params - query parameters
 * @returns {Promise<Array>} array of plain record objects
 */
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
}

async function verifyConnection() {
  await driver.verifyConnectivity();
}

async function closeDriver() {
  await driver.close();
}

module.exports = { driver, runQuery, verifyConnection, closeDriver };
