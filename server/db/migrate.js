const fs = require('fs');
const path = require('path');
const pool = require('./index');

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run migrations in correct order (dependencies first)
    const migrations = [
      '003_create_accounts_tables.sql',   // First create accounts tables
      '001_create_gate_tables.sql',       // Then create gate tables
      '002_create_store_tables.sql',      // Then store tables
      '006_fix_gate_entries_foreign_keys.sql'  // Finally, fix foreign keys
    ];

    // Run migrations
    for (const migration of migrations) {
      try {
        const sql = fs.readFileSync(
          path.join(__dirname, 'migrations', migration),
          'utf8'
        );
        await client.query(sql);
        console.log(`Migration ${migration} completed successfully`);
      } catch (error) {
        console.error(`Error in migration ${migration}:`, error);
        throw error;
      }
    }

    await client.query('COMMIT');
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
