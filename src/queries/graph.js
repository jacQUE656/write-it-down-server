const { runQuery } = require('../db');

async function getUserGraph(userEmail) {
  const entryCypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(e:Entry)
    OPTIONAL MATCH (e)-[r1:HAS_TODO|HAS_NOTE|TAGGED|GRATEFUL_FOR|REFERENCES]->(child)
    OPTIONAL MATCH (e)-[r2:FOLLOWED_BY|LINKS_TO]->(other:Entry)
    RETURN e, r1, child, r2, other
  `;
  const noteCypher = `
    MATCH (u:User {email: $userEmail})-[:OWNS]->(n:Note)
    OPTIONAL MATCH (n)-[r:TAGGED]->(th:Theme)
    OPTIONAL MATCH (n)-[l:LINKS_TO]->(other:Note)
    RETURN n, r, th, l, other
  `;

  const [entryRecords, noteRecords] = await Promise.all([
    runQuery(entryCypher, { userEmail }),
    runQuery(noteCypher, { userEmail }),
  ]);

  const nodesById = new Map();
  const edges = [];

  const addNode = (node, label) => {
    if (!node) return;
    const id = node.identity.toString();
    if (!nodesById.has(id)) {
      nodesById.set(id, { id, label, ...node.properties });
    }
  };

  for (const r of entryRecords) {
    addNode(r.e, 'Entry');
    if (r.child) {
      const childLabel = r.child.labels[0];
      addNode(r.child, childLabel);
      edges.push({
        source: r.e.identity.toString(),
        target: r.child.identity.toString(),
        type: r.r1 ? r.r1.type : null,
      });
    }
    if (r.other) {
      addNode(r.other, 'Entry');
      edges.push({
        source: r.e.identity.toString(),
        target: r.other.identity.toString(),
        type: r.r2 ? r.r2.type : null,
      });
    }
  }

  for (const r of noteRecords) {
    addNode(r.n, 'Note');
    if (r.th) {
      addNode(r.th, 'Theme');
      edges.push({
        source: r.n.identity.toString(),
        target: r.th.identity.toString(),
        type: 'TAGGED',
      });
    }
    if (r.other) {
      addNode(r.other, 'Note');
      edges.push({
        source: r.n.identity.toString(),
        target: r.other.identity.toString(),
        type: 'LINKS_TO',
      });
    }
  }

  return { nodes: Array.from(nodesById.values()), edges };
}

module.exports = { getUserGraph };
