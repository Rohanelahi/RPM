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
  connectionTimeoutMillis: 10000, // Increased timeout
  ssl: false,
  application_name: 'rosepapermill-server',
  // Add connection retry logic
  retryDelay: 1000,
  maxRetries: 3
});

// Test the connection
pool.on('connect', (client) => {
  console.log('Database connected successfully');
  // Set the search path and other session variables
  client.query('SET search_path TO public');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
  console.log('Attempting to reconnect...');
});

// Test the connection immediately
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    console.log('Server will continue but database operations may fail');
    console.log('Please check your database connection and restart the server');
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = pool;
