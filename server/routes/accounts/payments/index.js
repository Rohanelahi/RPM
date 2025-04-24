const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Add receiver_name column to payments table
const addReceiverNameColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND column_name = 'receiver_name'
        ) THEN 
          ALTER TABLE payments ADD COLUMN receiver_name VARCHAR(100);
        END IF;
      END $$;
    `);
    console.log('Receiver name column added successfully or already exists');
  } catch (error) {
    console.error('Error adding receiver_name column:', error);
  } finally {
    client.release();
  }
};

// Add voucher_no column to payments table
const addVoucherNoColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND column_name = 'voucher_no'
        ) THEN 
          ALTER TABLE payments ADD COLUMN voucher_no VARCHAR(20);
        END IF;
      END $$;
    `);
    console.log('Voucher number column added successfully or already exists');
  } catch (error) {
    console.error('Error adding voucher_no column:', error);
  } finally {
    client.release();
  }
};

// Add processed_by_role column to payments table
const addProcessedByRoleColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND column_name = 'processed_by_role'
        ) THEN 
          ALTER TABLE payments ADD COLUMN processed_by_role VARCHAR(20);
        END IF;
      END $$;
    `);
    console.log('Processed by role column added successfully or already exists');
  } catch (error) {
    console.error('Error adding processed_by_role column:', error);
  } finally {
    client.release();
  }
};

// Add bank_account_id column if it doesn't exist
const addBankAccountIdColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND column_name = 'bank_account_id'
        ) THEN 
          ALTER TABLE payments ADD COLUMN bank_account_id INTEGER REFERENCES bank_accounts(id);
        END IF;
      END $$;
    `);
    console.log('Bank account ID column added successfully or already exists');
  } catch (error) {
    console.error('Error adding bank_account_id column:', error);
  } finally {
    client.release();
  }
};

// Run the migration when the server starts
addReceiverNameColumn();
addVoucherNoColumn();
addProcessedByRoleColumn();
addBankAccountIdColumn();

// Generate next voucher number
const generateVoucherNo = async (type, client) => {
  const year = new Date().getFullYear();
  const prefix = type === 'RECEIVED' ? 'RV' : 'PV';
  
  // Changed the query to properly extract the last number
  const { rows } = await client.query(
    `SELECT voucher_no
     FROM payments 
     WHERE voucher_no LIKE $1 
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}${year}%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0 && rows[0].voucher_no) {
    // Extract the numeric part and increment
    const lastNumber = parseInt(rows[0].voucher_no.substring(6)); // Skip prefix and year
    nextNumber = lastNumber + 1;
  }
  
  // Format: PV20240001 or RV20240001
  const voucherNo = `${prefix}${year}${nextNumber.toString().padStart(4, '0')}`;
  console.log('Generated voucher number:', voucherNo); // Debug log
  
  return voucherNo;
};

// Process payment received
router.post('/received', async (req, res) => {
  const {
    account_id,
    amount,
    payment_date,
    payment_mode,
    receiver_name,
    remarks,
    voucher_no,
    is_tax_payment,
    created_by,
    processed_by_role,
    account_type,
    bank_account_id
  } = req.body;

  // Validate required fields
  if (!payment_date) {
    return res.status(400).json({ error: 'Payment date is required' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate voucher number if not provided
    const finalVoucherNo = voucher_no || await generateVoucherNo('RECEIVED', client);

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (
        account_id, amount, payment_date, payment_mode,
        payment_type, receiver_name, remarks,
        voucher_no, is_tax_payment, created_by, processed_by_role, account_type,
        bank_account_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        account_id,
        amount,
        new Date(payment_date),
        payment_mode,
        'RECEIVED',
        receiver_name,
        remarks,
        finalVoucherNo,
        is_tax_payment || false,
        created_by,
        processed_by_role,
        account_type,
        bank_account_id
      ]
    );

    // If payment mode is CASH, update cash balance
    if (payment_mode === 'CASH') {
      // Get current cash balance
      const cashBalanceResult = await client.query(`
        SELECT COALESCE(
          SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
          0
        ) as current_balance
        FROM cash_transactions
      `);
      
      const currentBalance = Number(cashBalanceResult.rows[0].current_balance);
      const newBalance = currentBalance + Number(amount);

      // Create cash transaction
      await client.query(
        `INSERT INTO cash_transactions (
          type, amount, reference, remarks, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'CREDIT',
          amount,
          'Payment Received',
          remarks || `Payment from ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );

      // Update cash_tracking table
      await client.query(
        `UPDATE cash_tracking 
         SET cash_in_hand = $1,
             last_updated = CURRENT_TIMESTAMP`,
        [newBalance]
      );
    } else if (payment_mode === 'ONLINE' && bank_account_id) {
      // Get current bank balance
      const bankBalanceResult = await client.query(`
        SELECT COALESCE(
          SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
          0
        ) as current_balance
        FROM bank_transactions
        WHERE account_id = $1
      `, [bank_account_id]);
      
      const currentBalance = Number(bankBalanceResult.rows[0].current_balance);
      const newBalance = currentBalance + Number(amount);

      // Create bank transaction
      await client.query(
        `INSERT INTO bank_transactions (
          account_id, type, amount, reference, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          bank_account_id,
          'CREDIT',
          amount,
          `Payment from ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );
    }

    await client.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process payment'
    });
  } finally {
    client.release();
  }
});

// Process payment issued
router.post('/issued', async (req, res) => {
  const {
    account_id,
    amount,
    payment_date,
    payment_mode,
    receiver_name,
    remarks,
    voucher_no,
    is_tax_payment,
    created_by,
    processed_by_role,
    account_type,
    bank_account_id
  } = req.body;

  // Validate required fields
  if (!payment_date) {
    return res.status(400).json({ error: 'Payment date is required' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate voucher number if not provided
    const finalVoucherNo = voucher_no || await generateVoucherNo('ISSUED', client);

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (
        account_id, amount, payment_date, payment_mode,
        payment_type, receiver_name, remarks,
        voucher_no, is_tax_payment, created_by, processed_by_role, account_type,
        bank_account_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        account_id,
        amount,
        new Date(payment_date),
        payment_mode,
        'ISSUED',
        receiver_name,
        remarks,
        finalVoucherNo,
        is_tax_payment || false,
        created_by,
        processed_by_role,
        account_type,
        bank_account_id
      ]
    );

    // If payment mode is CASH, update cash balance
    if (payment_mode === 'CASH') {
      // Get current cash balance
      const cashBalanceResult = await client.query(`
        SELECT COALESCE(
          SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
          0
        ) as current_balance
        FROM cash_transactions
      `);
      
      const currentBalance = Number(cashBalanceResult.rows[0].current_balance);
      const newBalance = currentBalance - Number(amount);

      if (newBalance < 0) {
        throw new Error('Insufficient cash balance');
      }

      // Create cash transaction
      await client.query(
        `INSERT INTO cash_transactions (
          type, amount, reference, remarks, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'DEBIT',
          amount,
          'Payment Issued',
          remarks || `Payment to ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );

      // Update cash_tracking table
      await client.query(
        `UPDATE cash_tracking 
         SET cash_in_hand = $1,
             last_updated = CURRENT_TIMESTAMP`,
        [newBalance]
      );
    } else if (payment_mode === 'ONLINE' && bank_account_id) {
      // Get current bank balance
      const bankBalanceResult = await client.query(`
        SELECT current_balance
        FROM bank_accounts
        WHERE id = $1
      `, [bank_account_id]);
      
      if (bankBalanceResult.rows.length === 0) {
        throw new Error('Bank account not found');
      }

      const currentBalance = Number(bankBalanceResult.rows[0].current_balance);
      const newBalance = currentBalance - Number(amount);

      if (newBalance < 0) {
        throw new Error('Insufficient bank balance');
      }

      // Create bank transaction
      await client.query(
        `INSERT INTO bank_transactions (
          account_id, type, amount, reference, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          bank_account_id,
          'DEBIT',
          amount,
          `Payment to ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );

      // Update bank account balance
      await client.query(
        `UPDATE bank_accounts 
         SET current_balance = $1
         WHERE id = $2`,
        [newBalance, bank_account_id]
      );
    }

    await client.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process payment'
    });
  } finally {
    client.release();
  }
});

// Get payment history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, accountType, paymentType } = req.query;
    console.log('Query parameters:', { startDate, endDate, accountType, paymentType });

    let query = `
      SELECT 
        p.*,
        a.account_name,
        a.account_type,
        CASE 
          WHEN p.bank_account_id IS NOT NULL THEN b.bank_name
          ELSE NULL
        END as bank_name
      FROM payments p
      JOIN accounts a ON p.account_id = a.id
      LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND DATE(p.payment_date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(p.payment_date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    if (accountType) {
      query += ` AND a.account_type = $${paramCount}`;
      queryParams.push(accountType);
      paramCount++;
    }

    if (paymentType) {
      query += ` AND p.payment_type = $${paramCount}`;
      queryParams.push(paymentType);
      paramCount++;
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    console.log('Executing query:', query);
    console.log('Query parameters:', queryParams);

    const { rows } = await pool.query(query, queryParams);
    console.log('Query results:', rows);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: error.message || 'Error fetching payment history' });
  }
});

// Add this new endpoint
router.get('/generate-voucher/:type', async (req, res) => {
  const client = await pool.connect();
  try {
    const { type } = req.params; // 'ISSUED' or 'RECEIVED'
    const voucherNo = await generateVoucherNo(type, client);
    res.json({ voucherNo });
  } catch (error) {
    console.error('Error generating voucher number:', error);
    res.status(500).json({ message: 'Error generating voucher number' });
  } finally {
    client.release();
  }
});

module.exports = router; 