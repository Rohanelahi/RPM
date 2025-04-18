const express = require('express');
const router = express.Router();
const pool = require('../../db');

// First, create tables with all necessary schemas
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(50) NOT NULL UNIQUE,
        branch_name VARCHAR(100),
        ifsc_code VARCHAR(20),
        account_type VARCHAR(20) DEFAULT 'CURRENT',
        balance NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES bank_accounts(id),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        balance NUMERIC(15,2) NOT NULL,
        reference VARCHAR(100),
        type VARCHAR(10) CHECK (type IN ('CREDIT', 'DEBIT')),
        amount NUMERIC(15,2) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        balance_after NUMERIC(15,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cash_transactions (
        id SERIAL PRIMARY KEY,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(10) CHECK (type IN ('CREDIT', 'DEBIT')),
        amount NUMERIC(15,2) NOT NULL,
        reference VARCHAR(100),
        remarks TEXT,
        balance NUMERIC(15,2) NOT NULL,
        balance_after NUMERIC(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('All tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

// Create tables when the server starts
createTables();

// Get all bank accounts with latest balance
router.get('/bank-accounts', async (req, res) => {
  try {
    // First verify the tables exist
    await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bank_accounts'
      );
    `);

    const result = await pool.query(`
      WITH latest_balances AS (
        SELECT
          account_id,
          running_balance,
          ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY transaction_date DESC, id DESC) as rn
        FROM (
          SELECT
            t.*,
            SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END)
            OVER (PARTITION BY account_id ORDER BY transaction_date ASC, id ASC) as running_balance
          FROM bank_transactions t
        ) subq
      )
      SELECT
        b.id,
        b.bank_name,
        b.account_name,
        b.account_number,
        b.branch_name,
        b.ifsc_code,
        b.account_type,
        b.status,
        COALESCE(lb.running_balance, 0) as current_balance
      FROM bank_accounts b
      LEFT JOIN latest_balances lb ON b.id = lb.account_id AND lb.rn = 1
      WHERE b.status = $1
      ORDER BY b.bank_name
    `, ['ACTIVE']);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    // Return empty array instead of error if no data found
    if (err.code === '42P01') { // Table does not exist
      res.json([]);
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch bank accounts',
        details: err.message 
      });
    }
  }
});

// Create new bank account
router.post('/bank-accounts', async (req, res) => {
  const {
    bank_name,
    account_name,
    account_number,
    branch_name,
    ifsc_code,
    account_type,
    opening_balance
  } = req.body;

  try {
    await pool.query('BEGIN');

    // Create bank account
    const accountResult = await pool.query(
      `INSERT INTO bank_accounts (
        bank_name, account_name, account_number, branch_name, 
        ifsc_code, account_type, balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [bank_name, account_name, account_number, branch_name, ifsc_code, account_type, opening_balance]
    );

    // Create initial transaction if opening balance > 0
    if (parseFloat(opening_balance) > 0) {
      await pool.query(
        `INSERT INTO bank_transactions (
          account_id, type, amount, reference, balance, balance_after
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          accountResult.rows[0].id,
          'CREDIT',
          opening_balance,
          'Opening Balance',
          0,
          opening_balance
        ]
      );
    }

    await pool.query('COMMIT');
    res.json(accountResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error creating bank account:', err);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

// Process bank transaction
router.post('/bank-transactions', async (req, res) => {
  const { account_id, type, amount, reference, updateCash = false } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get current bank balance
    const balanceResult = await client.query(`
      SELECT COALESCE(
        SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
        0
      ) as current_balance
      FROM bank_transactions
      WHERE account_id = $1
    `, [account_id]);
    
    const currentBalance = Number(balanceResult.rows[0].current_balance);
    const transactionAmount = Number(amount);
    
    // Calculate new bank balance
    let newBalance = currentBalance;
    if (type === 'CREDIT') {
      newBalance = currentBalance + transactionAmount;
    } else if (type === 'DEBIT') {
      if (currentBalance >= transactionAmount) {
        newBalance = currentBalance - transactionAmount;
      } else {
        throw new Error('Insufficient balance');
      }
    }

    // Create bank transaction record
    const transactionResult = await client.query(
      `INSERT INTO bank_transactions 
       (account_id, type, amount, reference, balance, balance_after, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [account_id, type, transactionAmount, reference, currentBalance, newBalance]
    );

    // If this is a withdrawal (DEBIT) and updateCash is true
    if (type === 'DEBIT' && updateCash) {
      // Get current cash balance
      const cashBalanceResult = await client.query(`
        SELECT cash_in_hand
        FROM cash_tracking
        LIMIT 1
      `);
      
      const currentCashBalance = Number(cashBalanceResult.rows[0].cash_in_hand || 0);
      const newCashBalance = currentCashBalance + transactionAmount;

      // Update cash_tracking table
      await client.query(
        `UPDATE cash_tracking 
         SET cash_in_hand = $1,
             last_updated = CURRENT_TIMESTAMP`,
        [newCashBalance]
      );

      // Create cash transaction record
      await client.query(
        `INSERT INTO cash_transactions 
         (type, amount, reference, remarks, balance, balance_after, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        ['CREDIT', transactionAmount, 'Bank Withdrawal', reference, currentCashBalance, newCashBalance]
      );
    }

    await client.query('COMMIT');

    // Return transaction with updated balance
    const fullResult = await client.query(
      `SELECT 
        t.*,
        b.bank_name,
        b.account_number
       FROM bank_transactions t 
       JOIN bank_accounts b ON t.account_id = b.id 
       WHERE t.id = $1`,
      [transactionResult.rows[0].id]
    );
    
    res.json(fullResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing transaction:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process transaction'
    });
  } finally {
    client.release();
  }
});

// Get bank transactions with running balance
router.get('/bank-transactions', async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    console.log('Fetching transactions with params:', { startDate, endDate, accountId });

    let query = `
      SELECT 
        t.id,
        t.account_id,
        t.transaction_date,
        t.description as remarks,
        t.reference,
        t.type,
        t.amount,
        t.balance,
        t.created_at,
        b.bank_name,
        b.account_number,
        '' as receiver_name,
        '' as payment_type,
        '' as related_account_name,
        SUM(CASE
          WHEN t.type = 'CREDIT' THEN t.amount
          ELSE -t.amount
        END) OVER (
          PARTITION BY t.account_id
          ORDER BY t.transaction_date ASC, t.id ASC
        ) as running_balance
      FROM bank_transactions t
      LEFT JOIN bank_accounts b ON t.account_id = b.id
      WHERE 1=1
      ${accountId ? ' AND t.account_id = $1' : ''}
      ${startDate ? ` AND t.transaction_date >= ${accountId ? '$2' : '$1'}` : ''}
      ${endDate ? ` AND t.transaction_date <= ${accountId ? '$3' : '$2'} ` : ''}
      ORDER BY t.transaction_date DESC, t.id DESC
    `;

    const params = [];
    if (accountId) params.push(accountId);
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate + ' 23:59:59');

    console.log('Executing query:', query);
    console.log('With params:', params);

    const result = await pool.query(query, params);
    console.log('Query result:', result.rows.length, 'rows');
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: err.message,
      query: err.query,
      position: err.position
    });
  }
});
// Get cash balances endpoint
router.get('/cash-balances', async (req, res) => {
  try {
    // Calculate cash in hand from cash_transactions
    const cashResult = await pool.query(`
      WITH running_balance AS (
        SELECT 
          COALESCE(
            SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
            0
          ) as cash_in_hand
        FROM cash_transactions
      )
      SELECT 
        cash_in_hand,
        0 as cash_in_bank
      FROM running_balance
    `);

    res.json({
      cash_in_hand: Number(cashResult.rows[0]?.cash_in_hand || 0),
      cash_in_bank: 0
    });
  } catch (err) {
    console.error('Error fetching cash balances:', err);
    res.status(500).json({ error: 'Failed to fetch cash balances' });
  }
});

// Add cash transaction endpoint
router.post('/cash-transactions', async (req, res) => {
  const { type, amount, reference, remarks } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get current cash balance using running total
    const balanceResult = await client.query(`
      SELECT COALESCE(
        SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
        0
      ) as current_balance
      FROM cash_transactions
    `);
    
    const currentBalance = Number(balanceResult.rows[0].current_balance);
    const transactionAmount = Number(amount);
    
    // Calculate new balance
    let newBalance;
    if (type === 'CREDIT') {
      newBalance = currentBalance + transactionAmount;
    } else if (type === 'DEBIT') {
      if (currentBalance < transactionAmount) {
        throw new Error('Insufficient cash balance');
      }
      newBalance = currentBalance - transactionAmount;
    } else {
      throw new Error('Invalid transaction type');
    }

    // Create cash transaction record
    await client.query(
      `INSERT INTO cash_transactions 
       (type, amount, reference, remarks, balance, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [type, transactionAmount, reference, remarks, currentBalance, newBalance]
    );

    await client.query('COMMIT');
    res.json({ success: true, newBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing cash transaction:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process cash transaction'
    });
  } finally {
    client.release();
  }
});

module.exports = router; 
