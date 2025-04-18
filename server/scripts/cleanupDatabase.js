const pool = require('../db');

async function cleanupDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Disable foreign key checks temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED');

    // Get all tables in the public schema
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    // Drop all data from each table
    for (const table of tables) {
      console.log(`Cleaning table: ${table.table_name}`);
      await client.query(`TRUNCATE TABLE ${table.table_name} CASCADE`);
    }

    // Reset all sequences
    const { rows: sequences } = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);

    for (const sequence of sequences) {
      console.log(`Resetting sequence: ${sequence.sequence_name}`);
      await client.query(`ALTER SEQUENCE ${sequence.sequence_name} RESTART WITH 1`);
    }

    await client.query('COMMIT');
    console.log('Database cleanup completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during database cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log('Database cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  }); 