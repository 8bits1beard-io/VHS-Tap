require('dotenv').config();
const db = require('./src/database/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  await db.connect();

  console.log('🔧 Running database migration...\n');

  const migrationFile = path.join(__dirname, 'src/database/migrations/add_movie_metadata.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await db.run(statement);
      console.log('✅', statement.split('\n')[1]); // Print the ALTER TABLE line
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⏭️  Column already exists, skipping');
      } else {
        console.error('❌ Error:', error.message);
      }
    }
  }

  console.log('\n✨ Migration complete!\n');
}

runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
