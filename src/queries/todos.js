// queries/todos.js
const { runQuery } = require('../db');

async function quickAddTodo(userEmail, text, date) {
  const cypher = `
    MATCH (u:User {email: $userEmail})
    MERGE (u)-[:OWNS]->(e:Entry {date: $date})
    ON CREATE SET e.createdAt = datetime()
    WITH u, e
    OPTIONAL MATCH (u)-[:OWNS]->(prev:Entry)
    WHERE prev.date < $date
    WITH u, e, prev ORDER BY prev.date DESC LIMIT 1
    FOREACH (_ IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
      MERGE (prev)-[:FOLLOWED_BY]->(e)
    )
    WITH e
    CREATE (t:Todo {text: $text, done: false, createdAt: $date})
    CREATE (e)-[:HAS_TODO]->(t)
    RETURN t, e.date AS date
  `;
  const records = await runQuery(cypher, { userEmail, text, date });
  if (!records[0]) return null;
  return { ...records[0].t.properties, date: records[0].date };
}

/** Marks a todo done/not done. Ownership checked via the entry that owns it. */
async function setTodoDone(userEmail, todoText, entryDate, done) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry {date: $entryDate})-[:HAS_TODO]->(t:Todo {text: $todoText})
    SET t.done = $done
    RETURN t
  `;
  const records = await runQuery(cypher, { userEmail, entryDate, todoText, done });
  return records[0]?.t.properties;
}

/** Adds a BLOCKS relationship: blockingTodo must be done before blockedTodo. */
async function addBlocker(userEmail, blockedText, blockedDate, blockingText, blockingDate) {
  const cypher = `
    MATCH (u:User {email: $userEmail})
    MATCH (u)-[:OWNS]->(:Entry {date: $blockedDate})-[:HAS_TODO]->(blocked:Todo {text: $blockedText})
    MATCH (u)-[:OWNS]->(:Entry {date: $blockingDate})-[:HAS_TODO]->(blocking:Todo {text: $blockingText})
    MERGE (blocked)<-[:BLOCKS]-(blocking)
    RETURN blocked, blocking
  `;
  return runQuery(cypher, { userEmail, blockedText, blockedDate, blockingText, blockingDate });
}

/**
 * Stalled todos: open todos that are blocked, directly or transitively,
 * by other unfinished todos. Variable-length traversal (BLOCKS*0..).
 */
async function stalledTodos(userEmail) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)-[:HAS_TODO]->(t:Todo {done: false})
    OPTIONAL MATCH path = (t)<-[:BLOCKS*1..]-(blocker:Todo {done: false})
    WITH t, e, max(length(path)) AS blockedDepth
    RETURN t.text AS todo, e.date AS since, coalesce(blockedDepth, 0) AS blockedDepth
    ORDER BY blockedDepth DESC
  `;
  return runQuery(cypher, { userEmail });
}

/** All open todos for a user, most recent first. */
async function listOpenTodos(userEmail) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)-[:HAS_TODO]->(t:Todo {done: false})
    RETURN t.text AS text, e.date AS date
    ORDER BY e.date DESC
  `;
  return runQuery(cypher, { userEmail });
}

/**
 * Shares a todo with another user by email — same SHARED_WITH edge pattern
 * as notes, straight from the Todo node to the recipient's User node.
 */
async function shareTodo(ownerEmail, text, entryDate, recipientEmail) {
  if (recipientEmail === ownerEmail) {
    const err = new Error('You already have this todo — no need to share it with yourself.');
    err.status = 400;
    throw err;
  }

  const recipientCheck = await runQuery(
    `MATCH (u:User {email: $recipientEmail}) RETURN u`,
    { recipientEmail }
  );
  if (recipientCheck.length === 0) {
    const err = new Error('No account found with that email.');
    err.status = 404;
    throw err;
  }

  const ownerCheck = await runQuery(
    `MATCH (owner:User {email: $ownerEmail})-[:OWNS]->(:Entry {date: $entryDate})-[:HAS_TODO]->(t:Todo {text: $text}) RETURN t`,
    { ownerEmail, entryDate, text }
  );
  if (ownerCheck.length === 0) {
    const err = new Error('Todo not found.');
    err.status = 404;
    throw err;
  }

  await runQuery(
    `
    MATCH (owner:User {email: $ownerEmail})-[:OWNS]->(:Entry {date: $entryDate})-[:HAS_TODO]->(t:Todo {text: $text})
    MATCH (recipient:User {email: $recipientEmail})
    MERGE (t)-[:SHARED_WITH]->(recipient)
    `,
    { ownerEmail, entryDate, text, recipientEmail }
  );
  return { email: recipientEmail };
}

/** Revokes a todo share. */
async function unshareTodo(ownerEmail, text, entryDate, recipientEmail) {
  const cypher = `
    MATCH (owner:User {email: $ownerEmail})-[:OWNS]->(:Entry {date: $entryDate})-[:HAS_TODO]->(t:Todo {text: $text})
    MATCH (t)-[r:SHARED_WITH]->(:User {email: $recipientEmail})
    DELETE r
  `;
  await runQuery(cypher, { ownerEmail, entryDate, text, recipientEmail });
}

/** Todos someone else has shared with this user. */
async function listTodosSharedWithMe(userEmail) {
  const cypher = `
    MATCH (t:Todo)-[:SHARED_WITH]->(:User {email: $userEmail})
    MATCH (e:Entry)-[:HAS_TODO]->(t)
    MATCH (owner:User)-[:OWNS]->(e)
    RETURN t.text AS text, t.done AS done, e.date AS date,
           owner.name AS ownerName, owner.email AS ownerEmail
    ORDER BY e.date DESC
  `;
  return runQuery(cypher, { userEmail });
}

module.exports = {
  quickAddTodo, setTodoDone, addBlocker, stalledTodos, listOpenTodos,
  shareTodo, unshareTodo, listTodosSharedWithMe,
};
