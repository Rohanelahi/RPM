const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Import pool from db/index.js

// Import routes
const hrmRoutes = require('./routes/hrm');
const gateRoutes = require('./routes/gate'); // Updated path to new gate index
const storeRoutes = require('./routes/storeRoutes');
const accountsRoutes = require('./routes/accounts'); // Updated path to new accounts index
const inventoryRouter = require('./routes/store/inventory');
const departmentsRoute = require('./routes/departments');
const stockRoutes = require('./routes/stock');
const productionRoutes = require('./routes/production');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add pool to request object
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Routes
app.use('/api/hrm', hrmRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/store', inventoryRouter);
app.use('/api', departmentsRoute);
app.use('/api/stock', stockRoutes);
app.use('/api/production', productionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool closed.');
    process.exit(0);
  });
});