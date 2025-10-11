const fs = require('fs');
const path = require('path');
const database = require('./src/database/db');

async function runMigration() {
  try {
    console.log('Running awards field migration...');

    await database.connect();

    const migrationPath = path.join(__dirname, 'src/database/migrations/add_awards_field.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    await database.run(migration);

    console.log('✅ Migration completed successfully!');

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
