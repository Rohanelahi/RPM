module.exports = {
  apiUrl: process.env.API_URL || 'http://150.230.192.101:5000/api',
  port: process.env.PORT || 5000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rosepapermill',
    user: process.env.DB_USER || 'opc',
    password: process.env.DB_PASSWORD || '1234'
  }
}; 