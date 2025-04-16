const fs = require('fs');
const path = require('path');
const pool = require('./index');

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run migrations in correct order (dependencies first)
    const migrations = [
      '001_create_gate_tables.sql',       // First create basic tables
      '003_create_accounts_tables.sql',   // Then accounts tables
      '002_create_store_tables.sql',      // Then store tables
      '006_fix_gate_entries_foreign_keys.sql'  // Finally, fix foreign keys
    ];

    // First drop all existing tables to ensure clean state
    await client.query(`
      DROP TABLE IF EXISTS gate_entries_pricing CASCADE;
      DROP TABLE IF EXISTS pricing_entries CASCADE;
      DROP TABLE IF EXISTS store_entries CASCADE;
      DROP TABLE IF EXISTS store_items CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS gate_entries CASCADE;
      DROP TABLE IF EXISTS gate_returns CASCADE;
      DROP TABLE IF EXISTS accounts CASCADE;
      DROP TABLE IF EXISTS suppliers CASCADE;
      DROP TABLE IF EXISTS purchasers CASCADE;
    `);
    console.log('Dropped existing tables');

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
