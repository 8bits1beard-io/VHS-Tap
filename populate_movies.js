require('dotenv').config();
const jellyfinService = require('./src/services/jellyfin');
const db = require('./src/database/db');

// List of movies from the VHS cover art
const movieList = [
  { title: 'Alien', year: 1979 },
  { title: 'E.T. The Extra-Terrestrial', year: 1982 },
  { title: 'Starship Troopers', year: 1997 },
  { title: 'Pulp Fiction', year: 1994 },
  { title: 'Aliens', year: 1986 },
  { title: 'Ghostbusters', year: 1984 },
  { title: 'Terminator 2: Judgment Day', year: 1991 },
  { title: 'The Matrix', year: 1999 },
  { title: 'GoldenEye', year: 1995 },
  { title: 'Predator', year: 1987 },
  { title: 'Raiders of the Lost Ark', year: 1981 },
  { title: 'Lethal Weapon', year: 1987 },
  { title: 'Back to the Future', year: 1985 },
  { title: 'Gremlins', year: 1984 },
  { title: 'RoboCop', year: 1987 },
  { title: 'Star Wars', year: 1977 },
  { title: 'The Goonies', year: 1985 },
  { title: 'Jaws', year: 1975 },
  { title: '2001: A Space Odyssey', year: 1968 }
];

async function findMovie(title, year) {
  try {
    // Search for the movie in Jellyfin
    const results = await jellyfinService.searchMovies(title);

    if (results.length === 0) {
      console.log(`❌ Not found: ${title} (${year})`);
      return null;
    }

    // Try to find exact match by year
    let movie = results.find(m => m.ProductionYear === year);

    // If no exact match, take the first result
    if (!movie) {
      movie = results[0];
      console.log(`⚠️  Year mismatch for "${title}": Expected ${year}, found ${movie.ProductionYear || 'unknown'}`);
    }

    return {
      id: movie.Id,
      title: movie.Name,
      year: movie.ProductionYear,
      overview: movie.Overview
    };
  } catch (error) {
    console.error(`Error searching for "${title}":`, error.message);
    return null;
  }
}

async function insertMovie(movieData, index) {
  try {
    // Generate a placeholder token (VHS-001, VHS-002, etc.)
    const token = `VHS-${String(index + 1).padStart(3, '0')}`;

    // Check if already exists
    const existing = await db.get('SELECT * FROM vhs_tapes WHERE movie_id = ?', [movieData.id]);

    if (existing) {
      console.log(`⏭️  Skipping "${movieData.title}" - already in database`);
      return;
    }

    // Insert into database
    await db.run(
      `INSERT INTO vhs_tapes (token, movie_id, movie_title, movie_year)
       VALUES (?, ?, ?, ?)`,
      [token, movieData.id, movieData.title, movieData.year]
    );

    console.log(`✅ Added: ${token} -> ${movieData.title} (${movieData.year}) [ID: ${movieData.id}]`);
  } catch (error) {
    console.error(`Error inserting "${movieData.title}":`, error.message);
  }
}

async function main() {
  // Connect to database first
  await db.connect();

  console.log('🎬 Fetching movies from Jellyfin...\n');

  const foundMovies = [];
  const notFound = [];

  // Search for each movie
  for (let i = 0; i < movieList.length; i++) {
    const { title, year } = movieList[i];
    console.log(`Searching for: ${title} (${year})...`);

    const movie = await findMovie(title, year);

    if (movie) {
      foundMovies.push({ ...movie, index: i });
    } else {
      notFound.push({ title, year });
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Found ${foundMovies.length} out of ${movieList.length} movies`);
  console.log('='.repeat(60) + '\n');

  // Insert found movies into database
  console.log('💾 Adding movies to database...\n');

  for (const movie of foundMovies) {
    await insertMovie(movie, movie.index);
  }

  // Show summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Database population complete!');
  console.log('='.repeat(60));

  if (notFound.length > 0) {
    console.log('\n⚠️  Movies not found in Jellyfin:');
    notFound.forEach(({ title, year }) => {
      console.log(`   - ${title} (${year})`);
    });
    console.log('\nMake sure these movies are in your Jellyfin library.');
  }

  // Show what's in the database
  console.log('\n📼 Current VHS tapes in database:');
  const tapes = await db.all('SELECT token, movie_title, movie_year FROM vhs_tapes ORDER BY token');
  if (tapes.length === 0) {
    console.log('   (empty)');
  } else {
    tapes.forEach(tape => {
      console.log(`   ${tape.token}: ${tape.movie_title} (${tape.movie_year})`);
    });
  }

  console.log('\n💡 Note: Tokens are placeholders (VHS-001, etc.)');
  console.log('   Replace them with actual NFC tag IDs when you scan the tags.');
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
