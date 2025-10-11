const db = require('./src/database/db');

(async () => {
  await db.connect();
  const tape = await db.get(
    'SELECT token, movie_title, poster_url, plot, imdb_rating FROM vhs_tapes WHERE token = ?',
    ['VHS-003']
  );
  console.log(JSON.stringify(tape, null, 2));
  await db.close();
})().catch(console.error);
