const express = require('express');
const router = express.Router();
const pool = require('../../../../db');

// Create table if not exists
const createTable = async () => {
  try {
    // First, add the missing columns if they don't exist
    await pool.query(`
      ALTER TABLE chart_of_accounts_level3 
      ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS balance_type VARCHAR(10) CHECK (balance_type IN ('DEBIT', 'CREDIT'))
    `);
    console.log('Added missing columns to chart_of_accounts_level3 table');
  } catch (error) {
    console.error('Error adding columns:', error);
  }
};

// Initialize table
createTable();

// Get all accounts in hierarchical structure
router.get('/', async (req, res) => {
  try {
    const { account_type } = req.query;
    const query = `
      WITH level1_level2 AS (
        SELECT 
          c1.id as level1_id,
          c1.name as level1_name,
          c2.id as level2_id,
          c2.name as level2_name
        FROM chart_of_accounts_level1 c1
        LEFT JOIN chart_of_accounts_level2 c2 ON c2.level1_id = c1.id
      ),
      level3_accounts AS (
        SELECT 
          c3.*,
          c1.name as level1_name,
          c2.name as level2_name,
          CASE 
            WHEN c3.balance_type = 'DEBIT' THEN c3.opening_balance
            ELSE 0
          END as debit_balance,
          CASE 
            WHEN c3.balance_type = 'CREDIT' THEN c3.opening_balance
            ELSE 0
          END as credit_balance
        FROM chart_of_accounts_level3 c3
        JOIN chart_of_accounts_level1 c1 ON c3.level1_id = c1.id
        JOIN chart_of_accounts_level2 c2 ON c3.level2_id = c2.id
        ${account_type ? 'WHERE c3.account_type = $1' : ''}
      ),
      level2_groups AS (
        SELECT 
          l1l2.level1_id,
          l1l2.level1_name,
          l1l2.level2_id,
          l1l2.level2_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', l3.id,
                'name', l3.name,
                'opening_balance', l3.opening_balance,
                'balance_type', l3.balance_type,
                'account_type', l3.account_type,
                'debit_balance', l3.debit_balance,
                'credit_balance', l3.credit_balance,
                'level1_id', l3.level1_id,
                'level2_id', l3.level2_id
              )
            ) FILTER (WHERE l3.id IS NOT NULL),
            '[]'::json
          ) as level3_accounts
        FROM level1_level2 l1l2
        LEFT JOIN level3_accounts l3 ON l3.level1_id = l1l2.level1_id AND l3.level2_id = l1l2.level2_id
        GROUP BY l1l2.level1_id, l1l2.level1_name, l1l2.level2_id, l1l2.level2_name
      )
      SELECT 
        level1_id as id,
        level1_name as name,
        json_agg(
          json_build_object(
            'id', level2_id,
            'name', level2_name,
            'level3_accounts', level3_accounts
          )
          ORDER BY level2_name
        ) FILTER (WHERE level2_id IS NOT NULL) as level2_accounts
      FROM level2_groups
      GROUP BY level1_id, level1_name
      ORDER BY level1_name
    `;
    
    const result = await pool.query(query, account_type ? [account_type] : []);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new account
router.post('/', async (req, res) => {
  const { name, opening_balance, balance_type, level1_id, level2_id, account_type } = req.body;

  try {
    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert into chart_of_accounts_level3
      const result = await client.query(
        'INSERT INTO chart_of_accounts_level3 (name, opening_balance, balance_type, level1_id, level2_id, account_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, opening_balance, balance_type, level1_id, level2_id, account_type]
      );

      // Create corresponding ledger entry
      await client.query(
        'INSERT INTO ledgers (account_id, account_type, opening_balance, balance_type) VALUES ($1, $2, $3, $4)',
        [result.rows[0].id, 'LEVEL3', opening_balance, balance_type]
      );

      // Update parent level2 account balance
      await client.query(
        'UPDATE ledgers SET amount = amount + $1 WHERE account_id = $2 AND account_type = $3',
        [opening_balance, level2_id, 'LEVEL2']
      );

      // Update parent level1 account balance
      await client.query(
        'UPDATE ledgers SET amount = amount + $1 WHERE account_id = $2 AND account_type = $3',
        [opening_balance, level1_id, 'LEVEL1']
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
      res.status(400).json({ error: 'Account name already exists for this parent account' });
    } else {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all accounts with their balances
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        c3.*,
        c1.name as level1_name,
        c2.name as level2_name,
        COALESCE(SUM(l.amount), 0) as current_balance
      FROM chart_of_accounts_level3 c3
      JOIN chart_of_accounts_level1 c1 ON c3.level1_id = c1.id
      JOIN chart_of_accounts_level2 c2 ON c3.level2_id = c2.id
      LEFT JOIN ledgers l ON l.account_id = c3.id AND l.account_type = 'LEVEL3'
      GROUP BY c3.id, c1.name, c2.name
      ORDER BY c1.name, c2.name, c3.name
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, opening_balance, balance_type, level1_id, level2_id } = req.body;
  console.log('Updating account:', id, 'with data:', { name, opening_balance, balance_type, level1_id, level2_id });

  try {
    const result = await pool.query(
      'UPDATE chart_of_accounts_level3 SET name = $1, opening_balance = $2, balance_type = $3, level1_head = $4, level2_head = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, opening_balance, balance_type, level1_id, level2_id, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Account not found' });
    } else {
      console.log('Account updated successfully:', result.rows[0]);
      res.json(result.rows[0]);
    }
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Account name already exists for this parent account' });
    } else {
      console.error('Error updating account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Deleting account:', id);

  try {
    const result = await pool.query('DELETE FROM chart_of_accounts_level3 WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Account not found' });
    } else {
      console.log('Account deleted successfully:', result.rows[0]);
      res.json({ message: 'Account deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 