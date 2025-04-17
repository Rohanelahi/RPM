const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Add error handling for parameter setting errors
  onError: (err) => {
    if (err.code === '42501') {
      // Ignore permission denied errors for parameter setting
      console.log('Ignoring parameter setting error:', err.message);
    } else {
      console.error('Database error:', err);
    }
  }
});

// Test the connection
<<<<<<< HEAD
pool.on('connect', (client) => {
  console.log('Database connected successfully');
  // Set the search path and other session variables
  client.query('SET search_path TO public');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection immediately
=======
>>>>>>> 831f550 (fix: remove session_replication_role setting to fix database connection)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = pool;
