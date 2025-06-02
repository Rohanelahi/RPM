const express = require('express');
const router = express.Router();
const pool = require('../../../../db');

// Create table if not exists
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts_level1 (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        opening_balance DECIMAL(15,2) DEFAULT 0,
        balance_type VARCHAR(10) CHECK (balance_type IN ('DEBIT', 'CREDIT')),
        account_type VARCHAR(10) CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

createTable();

// Get all accounts with their balances
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        c1.*,
        COALESCE(SUM(l.amount), 0) as current_balance
      FROM chart_of_accounts_level1 c1
      LEFT JOIN ledgers l ON l.account_id = c1.id AND l.account_type = 'LEVEL1'
      GROUP BY c1.id
      ORDER BY c1.name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new account
router.post('/', async (req, res) => {
  const { name, opening_balance, balance_type, account_type } = req.body;

  try {
    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert into chart_of_accounts_level1
      const result = await client.query(
        'INSERT INTO chart_of_accounts_level1 (name, opening_balance, balance_type, account_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, opening_balance, balance_type, account_type]
      );

      // Create corresponding ledger entry
      await client.query(
        'INSERT INTO ledgers (account_id, account_type, opening_balance, balance_type) VALUES ($1, $2, $3, $4)',
        [result.rows[0].id, 'LEVEL1', opening_balance, balance_type]
      );

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Account name already exists' });
    } else {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update account
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, opening_balance, balance_type } = req.body;

  try {
    const result = await pool.query(
      'UPDATE chart_of_accounts_level1 SET name = $1, opening_balance = $2, balance_type = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, opening_balance, balance_type, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Account name already exists' });
    } else {
      console.error('Error updating account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM chart_of_accounts_level1 WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 