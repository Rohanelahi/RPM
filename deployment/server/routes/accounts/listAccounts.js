const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get all accounts
router.get('/list', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM accounts';
    
    // If type is provided, filter by account_type
    if (type) {
      query += ' WHERE account_type = $1';
    }
    
    query += ' ORDER BY account_name';
    
    const result = type 
      ? await pool.query(query, [type])
      : await pool.query(query);
      
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      message: 'Error fetching accounts',
      error: error.message 
    });
  }
});

// Add new endpoint for vendors
router.get('/vendors', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        account_name as name
      FROM accounts 
      WHERE account_type = 'VENDOR'
      ORDER BY account_name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ 
      message: 'Error fetching vendors',
      error: error.message 
    });
  }
});

module.exports = router; 