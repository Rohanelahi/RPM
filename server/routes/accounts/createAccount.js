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
      current_balance,
      chart_account_id,
      chart_account_level
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

    // Validate chart_account_id if provided
    if (chart_account_id) {
      const chartAccountCheck = await pool.query(
        'SELECT id FROM chart_of_accounts_level1 WHERE id = $1',
        [chart_account_id]
      );
      
      if (chartAccountCheck.rows.length === 0) {
        return res.status(400).json({
          message: 'Invalid chart account ID. Please select a valid chart account or leave it empty.'
        });
      }
    }

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
        current_balance,
        chart_account_id,
        chart_account_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        account_name,
        account_type,
        contact_person,
        phone,
        email,
        address,
        opening_balance || 0,
        current_balance || 0,
        chart_account_id || null,
        chart_account_level || 1
      ]
    );

    // If chart_account_id is provided, fetch the complete chart of accounts hierarchy
    if (chart_account_id) {
      try {
        const chartResult = await pool.query(`
          SELECT 
            json_build_object(
              'id', l1.id,
              'name', l1.name,
              'level2_accounts', (
                SELECT json_agg(
                  json_build_object(
                    'id', l2.id,
                    'name', l2.name
                  )
                )
                FROM chart_of_accounts_level2 l2
                WHERE l2.level1_id = l1.id
              )
            ) as chart_account
          FROM chart_of_accounts_level1 l1
          WHERE l1.id = $1
        `, [chart_account_id]);

        if (chartResult.rows[0]?.chart_account) {
          result.rows[0].chart_account = chartResult.rows[0].chart_account;
        }
      } catch (error) {
        console.error('Error fetching chart of accounts:', error);
        // Continue without chart account data if there's an error
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ 
      message: 'Error creating account',
      error: error.message 
    });
  }
});

module.exports = router; 