require('dotenv').config();
const bcrypt = require('bcrypt');
const { runQuery, closeDriver } = require('../db');

const DEMO_EMAIL = 'demo@loom.app';
const DEMO_PASSWORD = 'demopassword123';

const days = [
  { date: '2026-08-10', mood: 4, selfCare: false, quote: 'Growth is not a destination; it\'s a beautiful journey.', themes: ['work'], todos: ['Finish quarterly report'], gratitude: ['Coffee with a friend', 'Sunny morning'], note: 'Rough day at work, felt behind all afternoon.' },
  { date: '2026-08-11', mood: 6, selfCare: true, quote: 'Small steps every day.', themes: ['work', 'health'], todos: ['Go for a run'], gratitude: ['Good night\'s sleep'], note: 'Better today. Took a walk at lunch.' },
  { date: '2026-08-12', mood: 3, selfCare: false, quote: 'This too shall pass.', themes: ['work'], todos: ['Reply to client emails'], gratitude: ['Coffee with a friend'], note: 'Another stressful day, same project.' },
  { date: '2026-08-13', mood: 7, selfCare: true, quote: 'Rest is productive.', themes: ['health'], todos: ['Meal prep for the week'], gratitude: ['Weekend ahead', 'Warm shower'], note: 'Took the whole evening off, felt great.' },
  { date: '2026-08-14', mood: 8, selfCare: true, quote: 'Joy is found in small things.', themes: ['family'], todos: [], gratitude: ['Family dinner'], note: 'Lovely relaxed Sunday with family.' },
  { date: '2026-08-15', mood: 5, selfCare: false, quote: 'One day at a time.', themes: ['work'], todos: ['Prepare Monday presentation'], gratitude: ['Coffee with a friend'], note: 'Sunday scaries kicking in a bit.' },
  { date: '2026-08-16', mood: 2, selfCare: false, quote: 'It\'s okay to not be okay.', themes: ['work'], todos: ['Finish quarterly report'], gratitude: ['Understanding manager'], note: 'Same project stress as last week — noticing a pattern.' },
  { date: '2026-08-17', mood: 6, selfCare: true, quote: 'Progress, not perfection.', themes: ['work', 'health'], todos: ['Go for a run'], gratitude: ['Good night\'s sleep'], note: 'Running again seemed to help the stress.' },
];

async function seed() {
  console.log('Seeding demo user and two weeks of entries...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await runQuery(
    `
    MERGE (u:User {email: $email})
    ON CREATE SET u.name = 'Demo User', u.passwordHash = $passwordHash, u.authProvider = 'password', u.createdAt = datetime()
    `,
    { email: DEMO_EMAIL, passwordHash }
  );

  let prevDate = null;
  for (const day of days) {
    await runQuery(
      `
      MATCH (u:User {email: $email})
      CREATE (e:Entry {date: $date, moodScore: $mood, selfCare: $selfCare, quote: $quote, createdAt: datetime()})
      CREATE (u)-[:OWNS]->(e)
      WITH u, e
      UNWIND $todos AS todoText
      FOREACH (_ IN CASE WHEN todoText IS NOT NULL THEN [1] ELSE [] END |
        CREATE (t:Todo {text: todoText, done: false, createdAt: $date})
        CREATE (e)-[:HAS_TODO]->(t)
      )
      WITH u, e
      UNWIND $themes AS themeName
      MERGE (th:Theme {name: themeName})
      CREATE (e)-[:TAGGED]->(th)
      WITH u, e
      UNWIND $gratitude AS gratefulText
      CREATE (g:Gratitude {text: gratefulText})
      CREATE (e)-[:GRATEFUL_FOR]->(g)
      WITH e
      CREATE (n:Note {text: $note, createdAt: datetime()})
      CREATE (e)-[:HAS_NOTE]->(n)
      `,
      {
        email: DEMO_EMAIL, date: day.date, mood: day.mood, selfCare: day.selfCare,
        quote: day.quote, todos: day.todos.length ? day.todos : [null],
        themes: day.themes, gratitude: day.gratitude, note: day.note,
      }
    );

    if (prevDate) {
      await runQuery(
        `
        MATCH (u:User {email: $email})-[:OWNS]->(a:Entry {date: $prevDate})
        MATCH (u)-[:OWNS]->(b:Entry {date: $date})
        MERGE (a)-[:FOLLOWED_BY]->(b)
        `,
        { email: DEMO_EMAIL, prevDate, date: day.date }
      );
    }
    prevDate = day.date;
  }

  // Add a todo dependency chain to demonstrate the stalled-todos query:
  // "Finish quarterly report" is blocked by "Reply to client emails".
  await runQuery(
    `
    MATCH (u:User {email: $email})
    MATCH (u)-[:OWNS]->(:Entry {date: '2026-08-16'})-[:HAS_TODO]->(blocked:Todo {text: 'Finish quarterly report'})
    MATCH (u)-[:OWNS]->(:Entry {date: '2026-08-12'})-[:HAS_TODO]->(blocking:Todo {text: 'Reply to client emails'})
    MERGE (blocked)<-[:BLOCKS]-(blocking)
    `,
    { email: DEMO_EMAIL }
  );

  console.log(`Seed complete. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // Standalone long-form notes (class notes, project notes) — owned directly
  // by the user, wiki-linked to each other, and referenced from an entry.
const noteRecords = await runQuery(
    `
    MATCH (u:User {email: $email})
    CREATE (n1:Note {
      title: 'Project X — Architecture Notes',
      body: 'Project X uses a service-oriented backend with three main services: auth, billing, and notifications. Auth issues JWTs consumed by the other two. Billing integrates with Stripe webhooks. Notifications fan out over email and push. Open question: should billing and notifications share a message queue, or stay decoupled via REST calls?',
      createdAt: datetime(), updatedAt: datetime()
    })
    CREATE (u)-[:OWNS]->(n1)
    CREATE (n2:Note {
      title: 'Project X — Meeting Notes, Aug 12',
      body: 'Discussed the message queue question from the architecture notes. Team leaned toward a shared queue (RabbitMQ) to decouple billing and notifications going forward. Action: prototype by end of week.',
      createdAt: datetime(), updatedAt: datetime()
    })
    CREATE (u)-[:OWNS]->(n2)
    CREATE (n2)-[:LINKS_TO]->(n1)
    MERGE (th:Theme {name: 'work'})
    CREATE (n1)-[:TAGGED]->(th)
    CREATE (n2)-[:TAGGED]->(th)
    WITH u, n1  // <-- PASS n1 ALONG WITH u HERE
    MATCH (u)-[:OWNS]->(e:Entry {date: '2026-08-12'})
    MATCH (u)-[:OWNS]->(n2:Note {title: 'Project X — Meeting Notes, Aug 12'})
    CREATE (e)-[:REFERENCES]->(n2)
    RETURN n1, n2
    `,
    { email: DEMO_EMAIL }
  );
  console.log(`Created ${noteRecords.length ? 2 : 0} standalone notes, linked to each other and to an entry.`);

  console.log('Try GET /entries/2026-08-16/similar to see the multi-hop query in action.');
  await closeDriver();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
