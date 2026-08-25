const { runQuery } = require('../db');

/** Creates a new entry (with todos, themes, gratitude, and an optional note) owned by the user. */
async function createEntry({ userEmail, date, moodScore, selfCare, quote, todos = [], themes = [], gratitude = [], note }) {
  const cypher = `
    MATCH (u:User {email: $userEmail})
    CREATE (e:Entry {date: $date, moodScore: $moodScore, selfCare: $selfCare, quote: $quote, createdAt: datetime()})
    CREATE (u)-[:OWNS]->(e)
    WITH u, e
    OPTIONAL MATCH (u)-[:OWNS]->(prev:Entry)
    WHERE prev.date < $date
    WITH u, e, prev ORDER BY prev.date DESC LIMIT 1
    FOREACH (_ IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
      CREATE (prev)-[:FOLLOWED_BY]->(e)
    )
    WITH u, e
    UNWIND (CASE WHEN size($todos) = 0 THEN [null] ELSE $todos END) AS todoText
    FOREACH (_ IN CASE WHEN todoText IS NOT NULL THEN [1] ELSE [] END |
      CREATE (t:Todo {text: todoText, done: false, createdAt: $date})
      CREATE (e)-[:HAS_TODO]->(t)
    )
    WITH u, e
    UNWIND (CASE WHEN size($themes) = 0 THEN [null] ELSE $themes END) AS themeName
    FOREACH (_ IN CASE WHEN themeName IS NOT NULL THEN [1] ELSE [] END |
      MERGE (th:Theme {name: themeName})
      CREATE (e)-[:TAGGED]->(th)
    )
    WITH u, e
    UNWIND (CASE WHEN size($gratitude) = 0 THEN [null] ELSE $gratitude END) AS gratefulText
    FOREACH (_ IN CASE WHEN gratefulText IS NOT NULL THEN [1] ELSE [] END |
      CREATE (g:Gratitude {text: gratefulText})
      CREATE (e)-[:GRATEFUL_FOR]->(g)
    )
    WITH e
    FOREACH (_ IN CASE WHEN $note IS NOT NULL THEN [1] ELSE [] END |
      CREATE (n:Note {text: $note, createdAt: datetime()})
      CREATE (e)-[:HAS_NOTE]->(n)
    )
    RETURN e
  `;
  const records = await runQuery(cypher, {
    userEmail, date, moodScore, selfCare, quote: quote || null,
    todos, themes, gratitude, note: note || null,
  });
  return records[0]?.e.properties;
}

/** Lists all entries for a user, most recent first. */
async function listEntries(userEmail) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)
    RETURN e ORDER BY e.date DESC
  `;
  const records = await runQuery(cypher, { userEmail });
  return records.map((r) => r.e.properties);
}

/** Gets one entry with its todos, themes, gratitude items, and notes. */
async function getEntryDetail(userEmail, date) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry {date: $date})
    OPTIONAL MATCH (e)-[:HAS_TODO]->(t:Todo)
    OPTIONAL MATCH (e)-[:TAGGED]->(th:Theme)
    OPTIONAL MATCH (e)-[:GRATEFUL_FOR]->(g:Gratitude)
    OPTIONAL MATCH (e)-[:HAS_NOTE]->(n:Note)
    RETURN e,
           collect(DISTINCT t) AS todos,
           collect(DISTINCT th) AS themes,
           collect(DISTINCT g) AS gratitude,
           collect(DISTINCT n) AS notes
  `;
  const records = await runQuery(cypher, { userEmail, date });
  if (records.length === 0) return null;
  const r = records[0];
  return {
    entry: r.e.properties,
    todos: r.todos.map((t) => t.properties),
    themes: r.themes.map((t) => t.properties),
    gratitude: r.gratitude.map((g) => g.properties),
    notes: r.notes.map((n) => n.properties),
  };
}

/**
 * Multi-hop: "days like today" — the headline query.
 * Finds past entries sharing a theme with the given date, then surfaces
 * the mood on the day that followed each of those past entries.
 */
async function findSimilarDays(userEmail, date) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(today:Entry {date: $date})
    MATCH (today)-[:TAGGED]->(theme:Theme)<-[:TAGGED]-(past:Entry)<-[:OWNS]-(u)
    WHERE past.date < today.date
    MATCH (past)-[:FOLLOWED_BY]->(nextDay:Entry)
    RETURN past.date AS pastEntry, theme.name AS sharedTheme,
           nextDay.moodScore AS moodAfter, nextDay.date AS nextDate
    ORDER BY nextDay.moodScore DESC
  `;
  return runQuery(cypher, { userEmail, date });
}

/** Recurring gratitude items across a user's entries. */
async function recurringGratitude(userEmail) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)-[:GRATEFUL_FOR]->(g:Gratitude)
    WITH g.text AS item, count(e) AS mentions, collect(e.date) AS dates
    WHERE mentions > 1
    RETURN item, mentions, dates
    ORDER BY mentions DESC
  `;
  return runQuery(cypher, { userEmail });
}

/** Mood trend for the week following a given entry. */
async function moodTrend(userEmail, date) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry {date: $date})
    MATCH (e)-[:FOLLOWED_BY*1..7]->(later:Entry)
    RETURN later.date AS date, later.moodScore AS moodScore
    ORDER BY later.date
  `;
  return runQuery(cypher, { userEmail, date });
}

/** Manually link two entries ("this reminds me of that day"). */
async function linkEntries(userEmail, fromDate, toDate) {
  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(a:Entry {date: $fromDate})
    MATCH (u)-[:OWNS]->(b:Entry {date: $toDate})
    MERGE (a)-[:LINKS_TO]->(b)
    RETURN a, b
  `;
  return runQuery(cypher, { userEmail, fromDate, toDate });
}

module.exports = {
  createEntry, listEntries, getEntryDetail,
  findSimilarDays, recurringGratitude, moodTrend, linkEntries,
};
