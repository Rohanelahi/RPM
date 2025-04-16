const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Create new account
router.post('/create', async (req, res) => {
  try {
    const {
      account_name,
      account_type,
      contact_person,
      phone,
      email,
      address,
      opening_balance,
      current_balance
    } = req.body;

    if (!account_name || !account_type) {
      return res.status(400).json({ 
        message: 'Account name and type are required' 
      });
    }

    // First, update the check constraint to include VENDOR
    await pool.query(`
      ALTER TABLE accounts 
      DROP CONSTRAINT IF EXISTS accounts_account_type_check;
      
      ALTER TABLE accounts 
      ADD CONSTRAINT accounts_account_type_check 
      CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR'));
    `);

    // Then insert the new account
    const result = await pool.query(
      `INSERT INTO accounts (
        account_name, 
        account_type, 
        contact_person, 
        phone, 
        email, 
        address, 
        opening_balance, 
        current_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        account_name,
        account_type,
        contact_person,
        phone,
        email,
        address,
        opening_balance || 0,
        current_balance || 0
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ 
      message: 'Error creating account',
      error: error.message 
    });
  }
});

module.exports = router; 