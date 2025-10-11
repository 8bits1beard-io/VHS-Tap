const db = require('./src/database/db');

async function checkTokens() {
  await db.connect();
  const tapes = await db.all('SELECT token, movie_title, movie_year FROM vhs_tapes LIMIT 3');
  console.log(JSON.stringify(tapes, null, 2));
  await db.close();
}

checkTokens().catch(console.error);
