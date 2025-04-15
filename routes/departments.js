const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        code
      FROM departments
      ORDER BY name;
    `;
    
    const { rows } = await pool.query(query);
    
    // Remove any duplicates by code
    const uniqueDepartments = Array.from(
      new Map(rows.map(item => [item.code, item])).values()
    );
    
    res.json(uniqueDepartments);
    
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router; 