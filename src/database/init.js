const fs = require('fs');
const path = require('path');
const database = require('./db');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Connect to database
    await database.connect();

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await database.run(statement);
    }

    console.log('Database initialized successfully!');

    // Insert sample data for testing (optional)
    const sampleTape = await database.get('SELECT * FROM vhs_tapes LIMIT 1');
    if (!sampleTape) {
      console.log('Adding sample VHS tape...');
      await database.run(
        `INSERT INTO vhs_tapes (token, movie_id, movie_title, movie_year)
         VALUES (?, ?, ?, ?)`,
        ['SAMPLE-TOKEN-123', 'jellyfin-movie-id-here', 'Sample Movie', 1985]
      );
      console.log('Sample data added!');
    }

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
