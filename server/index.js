const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Import pool from db/index.js
const hrmRoutes = require('./routes/hrm');

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});