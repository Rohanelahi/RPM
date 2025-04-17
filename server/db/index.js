const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const config = require('../config');

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  user: config.database.user,
  host: config.database.host,
  database: config.database.database,
  password: config.database.password,
  port: config.database.port,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false,
  application_name: 'rosepapermill-server'
});

// Test the connection
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
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(-1);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = pool;
