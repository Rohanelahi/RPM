const { Pool } = require('pg');

const pool = new Pool({
  user: 'rosepapermill',
  host: 'localhost',
  database: 'rosepapermilldb',
  password: 'your_secure_password', // Use the password you set
  port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connection successful:', res.rows[0]);
  }
  pool.end();
});
