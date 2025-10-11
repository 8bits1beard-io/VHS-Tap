require('dotenv').config();
const axios = require('axios');
const db = require('./src/database/db');

// Using OMDB API - Free API for movie data
// Get your free API key at: http://www.omdbapi.com/apikey.aspx
const OMDB_API_KEY = process.env.OMDB_API_KEY || 'YOUR_API_KEY_HERE';
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

async function fetchMovieMetadata(title, year) {
  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        t: title,
        y: year,
        type: 'movie',
        plot: 'full'
      }
    });

    if (response.data.Response === 'True') {
      // Convert poster URL from HTTP to HTTPS to avoid mixed content issues
      let posterUrl = null;
      if (response.data.Poster && response.data.Poster !== 'N/A') {
        posterUrl = response.data.Poster.replace('http://', 'https://');
      }

      return {
        plot: response.data.Plot,
        poster_url: posterUrl,
        imdb_rating: response.data.imdbRating !== 'N/A' ? response.data.imdbRating : null,
        genre: response.data.Genre,
        director: response.data.Director,
        actors: response.data.Actors,
        writer: response.data.Writer !== 'N/A' ? response.data.Writer : null,
        runtime: response.data.Runtime,
        rated: response.data.Rated
      };
    } else {
      console.log(`  ⚠️  OMDB API: ${response.data.Error}`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error fetching metadata: ${error.message}`);
    return null;
  }
}

async function updateMovieMetadata(tapeId, metadata) {
  try {
    await db.run(
      `UPDATE vhs_tapes
       SET plot = ?, poster_url = ?, imdb_rating = ?, genre = ?,
           director = ?, actors = ?, writer = ?, runtime = ?, rated = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        metadata.plot,
        metadata.poster_url,
        metadata.imdb_rating,
        metadata.genre,
        metadata.director,
        metadata.actors,
        metadata.writer,
        metadata.runtime,
        metadata.rated,
        tapeId
      ]
    );
    console.log(`  ✅ Updated metadata`);
  } catch (error) {
    console.error(`  ❌ Error updating database: ${error.message}`);
  }
}

async function main() {
  // Check API key
  if (OMDB_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('❌ Please set OMDB_API_KEY in your .env file');
    console.log('   Get a free API key at: http://www.omdbapi.com/apikey.aspx');
    console.log('   Add this line to your .env file:');
    console.log('   OMDB_API_KEY=your_key_here');
    process.exit(1);
  }

  await db.connect();

  console.log('🎬 Fetching movie metadata from OMDB...\n');

  // Get all tapes from database
  const tapes = await db.all(
    'SELECT id, movie_title, movie_year, plot, poster_url, imdb_rating, genre FROM vhs_tapes ORDER BY token'
  );

  console.log(`Found ${tapes.length} movies in database\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const tape of tapes) {
    console.log(`📼 ${tape.movie_title} (${tape.movie_year})`);

    // Check if missing any metadata
    const missingMetadata = !tape.plot || !tape.poster_url || !tape.imdb_rating || !tape.genre;

    if (!missingMetadata) {
      console.log(`  ⏭️  Already has complete metadata, skipping`);
      skipped++;
      continue;
    }

    console.log(`  🔄 Missing metadata, fetching...`);

    // Fetch metadata from OMDB
    const metadata = await fetchMovieMetadata(tape.movie_title, tape.movie_year);

    if (metadata) {
      await updateMovieMetadata(tape.id, metadata);
      updated++;
    } else {
      failed++;
    }

    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Metadata fetch complete!');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  // Show sample of what we got
  if (updated > 0) {
    console.log('\n📋 Sample metadata:');
    const sample = await db.get(
      `SELECT movie_title, movie_year, imdb_rating, genre, runtime
       FROM vhs_tapes
       WHERE plot IS NOT NULL
       LIMIT 1`
    );
    if (sample) {
      console.log(`\nTitle: ${sample.movie_title} (${sample.movie_year})`);
      console.log(`Rating: ${sample.imdb_rating}/10`);
      console.log(`Genre: ${sample.genre}`);
      console.log(`Runtime: ${sample.runtime}`);
    }
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
