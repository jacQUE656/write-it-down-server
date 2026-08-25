const { runQuery } = require('../db');

async function searchAll(userEmail, query) {
  const q = query.toLowerCase();

  const cypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(n:Note)
    WHERE toLower(n.title) CONTAINS $q OR toLower(n.body) CONTAINS $q
    RETURN 'note' AS type, toString(id(n)) AS refId, n.title AS title,
           left(n.body, 140) AS snippet, null AS date

    UNION

    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)-[:HAS_TODO]->(t:Todo)
    WHERE toLower(t.text) CONTAINS $q
    RETURN 'todo' AS type, null AS refId, t.text AS title,
           null AS snippet, e.date AS date

    UNION

    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)
    OPTIONAL MATCH (e)-[:TAGGED]->(th:Theme)
    WITH e, collect(th.name) AS themeNames
    WHERE toLower(coalesce(e.quote, '')) CONTAINS $q
       OR any(tn IN themeNames WHERE toLower(tn) CONTAINS $q)
    RETURN 'entry' AS type, null AS refId, e.date AS title,
           e.quote AS snippet, e.date AS date
  `;

  return runQuery(cypher, { userEmail, q });
}

module.exports = { searchAll };
