const { runQuery } = require('../db');

/** Creates a new standalone note, optionally tagged with themes. */
async function createNote({ userEmail, title, body, themes = [] }) {
  const cypher = `
    MATCH (u:User {email: $userEmail})
    CREATE (n:Note {title: $title, body: $body, createdAt: datetime(), updatedAt: datetime()})
    CREATE (u)-[:OWNS]->(n)
    WITH n
    UNWIND (CASE WHEN size($themes) = 0 THEN [null] ELSE $themes END) AS themeName
    FOREACH (_ IN CASE WHEN themeName IS NOT NULL THEN [1] ELSE [] END |
      MERGE (th:Theme {name: themeName})
      CREATE (n)-[:TAGGED]->(th)
    )
    RETURN n, id(n) AS noteId
  `;
  const records = await runQuery(cypher, { userEmail, title, body, themes });
  if (!records[0]) return null;
  return { ...records[0].n.properties, noteId: records[0].noteId };
}

/** Lists all of a user's notes (title + preview only, not the full body). */
async function listNotes(userEmail) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(n:Note)
    RETURN n.title AS title, left(n.body, 200) AS preview, n.updatedAt AS updatedAt,
           id(n) AS noteId
    ORDER BY n.updatedAt DESC
  `;
  return runQuery(cypher, { userEmail });
}

/**
 * Gets one note in full. Accessible to the owner, or to anyone the note
 * has been shared with — the owner sees who it's shared with; a viewer
 * who isn't the owner does not (kept private to the owner).
 */
async function getNoteDetail(userEmail, noteId) {
  const cypher = `
    MATCH (n:Note) WHERE id(n) = $noteId
    MATCH (owner:User)-[:OWNS]->(n)
    WHERE owner.email = $userEmail
       OR EXISTS { (n)-[:SHARED_WITH]->(:User {email: $userEmail}) }
    OPTIONAL MATCH (n)-[:TAGGED]->(th:Theme)
    OPTIONAL MATCH (n)-[:LINKS_TO]->(out:Note)
    OPTIONAL MATCH (n)<-[:LINKS_TO]-(in:Note)
    OPTIONAL MATCH (n)-[:SHARED_WITH]->(sw:User)
    RETURN n, owner.email AS ownerEmail, owner.name AS ownerName,
           collect(DISTINCT th.name) AS themes,
           collect(DISTINCT {id: id(out), title: out.title}) AS linksOut,
           collect(DISTINCT {id: id(in), title: in.title}) AS linkedFrom,
           collect(DISTINCT {email: sw.email, name: sw.name}) AS sharedWith
  `;
  const records = await runQuery(cypher, { userEmail, noteId: parseInt(noteId, 10) });
  if (records.length === 0) return null;
  const r = records[0];
  const isOwner = r.ownerEmail === userEmail;
  return {
    note: r.n.properties,
    isOwner,
    owner: isOwner ? null : { email: r.ownerEmail, name: r.ownerName },
    themes: r.themes.filter(Boolean),
    linksOut: r.linksOut.filter((l) => l.id !== null),
    linkedFrom: r.linkedFrom.filter((l) => l.id !== null),
    sharedWith: isOwner ? r.sharedWith.filter((s) => s.email !== null) : [],
  };
}

/**
 * Shares a note with another user by email. The recipient must already
 * have an account — sharing just creates a SHARED_WITH edge from the note
 * straight to their User node, so "who can see this" is itself part of
 * the graph rather than a separate permissions table.
 */
async function shareNote(ownerEmail, noteId, recipientEmail) {
  if (recipientEmail === ownerEmail) {
    const err = new Error('You already have this note — no need to share it with yourself.');
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
    `MATCH (owner:User {email: $ownerEmail})-[:OWNS]->(n:Note) WHERE id(n) = $noteId RETURN n`,
    { ownerEmail, noteId: parseInt(noteId, 10) }
  );
  if (ownerCheck.length === 0) {
    const err = new Error('Note not found.');
    err.status = 404;
    throw err;
  }

  await runQuery(
    `
    MATCH (n:Note) WHERE id(n) = $noteId
    MATCH (recipient:User {email: $recipientEmail})
    MERGE (n)-[:SHARED_WITH]->(recipient)
    `,
    { noteId: parseInt(noteId, 10), recipientEmail }
  );
  return { email: recipientEmail };
}

/** Revokes a note share. */
async function unshareNote(ownerEmail, noteId, recipientEmail) {
  const cypher = `
    MATCH (owner:User {email: $ownerEmail})-[:OWNS]->(n:Note)
    WHERE id(n) = $noteId
    MATCH (n)-[r:SHARED_WITH]->(:User {email: $recipientEmail})
    DELETE r
  `;
  await runQuery(cypher, { ownerEmail, noteId: parseInt(noteId, 10), recipientEmail });
}

/** Notes someone else has shared with this user. */
async function listNotesSharedWithMe(userEmail) {
  const cypher = `
    MATCH (n:Note)-[:SHARED_WITH]->(:User {email: $userEmail})
    MATCH (owner:User)-[:OWNS]->(n)
    RETURN n.title AS title, left(n.body, 200) AS preview, n.updatedAt AS updatedAt,
           id(n) AS noteId, owner.name AS ownerName, owner.email AS ownerEmail
    ORDER BY n.updatedAt DESC
  `;
  return runQuery(cypher, { userEmail });
}

/** Updates a note's title/body (e.g. ongoing class or project notes). */
async function updateNote(userEmail, noteId, { title, body }) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(n:Note)
    WHERE id(n) = $noteId
    SET n.title = coalesce($title, n.title),
        n.body = coalesce($body, n.body),
        n.updatedAt = datetime()
    RETURN n
  `;
  const records = await runQuery(cypher, {
    userEmail, noteId: parseInt(noteId, 10), title: title ?? null, body: body ?? null,
  });
  return records[0]?.n.properties;
}

/** Wiki-style link between two of a user's own notes. */
async function linkNotes(userEmail, fromNoteId, toNoteId) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(a:Note)
    WHERE id(a) = $fromNoteId
    MATCH (u)-[:OWNS]->(b:Note)
    WHERE id(b) = $toNoteId
    MERGE (a)-[:LINKS_TO]->(b)
    RETURN a, b
  `;
  return runQuery(cypher, {
    userEmail, fromNoteId: parseInt(fromNoteId, 10), toNoteId: parseInt(toNoteId, 10),
  });
}

/** Points a daily entry at a longer standalone note (e.g. "worked on Project X" → Project X notes). */
async function referenceNoteFromEntry(userEmail, entryDate, noteId) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry {date: $entryDate})
    MATCH (u)-[:OWNS]->(n:Note)
    WHERE id(n) = $noteId
    MERGE (e)-[:REFERENCES]->(n)
    RETURN e, n
  `;
  return runQuery(cypher, { userEmail, entryDate, noteId: parseInt(noteId, 10) });
}

/**
 * Multi-hop: notes related to a given note, even indirectly — via a shared
 * theme, OR reachable within 2 hops through the LINKS_TO web.
 */
async function relatedNotes(userEmail, noteId) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(n:Note)
    WHERE id(n) = $noteId
    OPTIONAL MATCH (n)-[:TAGGED]->(:Theme)<-[:TAGGED]-(byTheme:Note)<-[:OWNS]-(u)
    WHERE id(byTheme) <> id(n)
    OPTIONAL MATCH (n)-[:LINKS_TO*1..2]-(byLink:Note)<-[:OWNS]-(u)
    WHERE id(byLink) <> id(n)
    WITH collect(DISTINCT byTheme) + collect(DISTINCT byLink) AS related
    UNWIND related AS r
    WITH DISTINCT r
    WHERE r IS NOT NULL
    RETURN r.title AS title, id(r) AS noteId
  `;
  return runQuery(cypher, { userEmail, noteId: parseInt(noteId, 10) });
}

module.exports = {
  createNote, listNotes, getNoteDetail, updateNote,
  linkNotes, referenceNoteFromEntry, relatedNotes,
  shareNote, unshareNote, listNotesSharedWithMe,
};
