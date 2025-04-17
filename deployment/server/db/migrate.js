const fs = require('fs');
const path = require('path');
const pool = require('./index');

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run migrations in correct order (dependencies first)
    const migrations = [
      '003_create_accounts_tables.sql',   // First create accounts
      '002_create_store_tables.sql',      // Then store tables (depends on accounts)
      '001_create_gate_tables.sql',       // Then gate tables (depends on accounts)
      '006_fix_gate_entries_foreign_keys.sql',  // Fix foreign keys
      '20240417_add_monthly_price_averages.sql'  // Add monthly price averages table
    ];

    // First drop all existing tables to ensure clean state
    await client.query(`
      DROP TABLE IF EXISTS monthly_price_averages CASCADE;
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
      const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', migration),
        'utf8'
      );
      await client.query(sql);
      console.log(`Migration ${migration} completed successfully`);
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