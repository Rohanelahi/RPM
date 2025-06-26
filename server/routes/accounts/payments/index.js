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

    // Get bank account details if payment is online
    let bankAccountName = null;
    if (payment_mode === 'ONLINE' && bank_account_id) {
      const bankAccountResult = await client.query(
        'SELECT bank_name FROM bank_accounts WHERE id = $1',
        [bank_account_id]
      );
      if (bankAccountResult.rows.length > 0) {
        bankAccountName = bankAccountResult.rows[0].bank_name;
      }
    }

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

    // Create transaction record for the ledger
    await client.query(
      `INSERT INTO transactions (
        transaction_date,
        account_id,
        reference_no,
        entry_type,
        amount,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        new Date(payment_date),
        account_id,
        finalVoucherNo, // Use the full voucher number as reference
        'CREDIT',
        amount,
        `Payment received${payment_mode === 'CASH' ? ' in cash' : payment_mode === 'ONLINE' && bankAccountName ? ` via bank transfer (${bankAccountName})` : ''}${remarks ? ` - ${remarks}` : ''}`
      ]
    );

    // If payment mode is CASH, update cash balance
    if (payment_mode === 'CASH') {
      // Get current cash balance
      const cashBalanceResult = await client.query(`
        SELECT COALESCE(
          SUM(CASE 
            WHEN type = 'CREDIT' THEN amount 
            WHEN type = 'DEBIT' THEN -amount 
            ELSE 0 
          END),
          0
        ) as current_balance
        FROM cash_transactions
        WHERE transaction_date <= $1
      `, [new Date(payment_date)]);
      
      const currentBalance = Number(cashBalanceResult.rows[0].current_balance);
      const newBalance = currentBalance + Number(amount);

      console.log('Cash balance update:', {
        currentBalance,
        amount,
        newBalance,
        paymentDate: payment_date,
        voucherNo: finalVoucherNo
      });

      // Create cash transaction
      await client.query(
        `INSERT INTO cash_transactions (
          type, amount, reference, remarks, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'CREDIT',
          amount,
          finalVoucherNo,
          remarks || `Payment from ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );

      // Update cash balance in bank_accounts table
      await client.query(`
        UPDATE bank_accounts 
        SET balance = $1,
            last_updated = NOW()
        WHERE account_type = 'CASH'
      `, [newBalance]);
    }

    // If payment mode is ONLINE, update bank balance
    if (payment_mode === 'ONLINE' && bank_account_id) {
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
          account_id, type, amount, reference, remarks, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          bank_account_id,
          'CREDIT',
          amount,
          finalVoucherNo,
          remarks || `Payment from ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
      );
    }

    await client.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
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

    // Get bank account details if payment is online
    let bankAccountName = null;
    if (payment_mode === 'ONLINE' && bank_account_id) {
      const bankAccountResult = await client.query(
        'SELECT bank_name FROM bank_accounts WHERE id = $1',
        [bank_account_id]
      );
      if (bankAccountResult.rows.length > 0) {
        bankAccountName = bankAccountResult.rows[0].bank_name;
      }
    }

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
        account_type === 'OTHER' ? 'EXPENSE' : 'ISSUED', // Set payment_type as EXPENSE for OTHER account type
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

    // Create transaction record for the ledger
    await client.query(
      `INSERT INTO transactions (
        transaction_date,
        account_id,
        reference_no,
        entry_type,
        amount,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        new Date(payment_date),
        account_id,
        finalVoucherNo, // Use the full voucher number as reference
        'DEBIT',
        amount,
        `Payment issued${payment_mode === 'CASH' ? ' in cash' : payment_mode === 'ONLINE' && bankAccountName ? ` via bank transfer (${bankAccountName})` : ''}${remarks ? ` - ${remarks}` : ''}`
      ]
    );

    // If payment mode is CASH, update cash balance
    if (payment_mode === 'CASH') {
      // Get current cash balance
      const cashBalanceResult = await client.query(`
        SELECT COALESCE(
          SUM(CASE 
            WHEN type = 'CREDIT' THEN amount 
            WHEN type = 'DEBIT' THEN -amount 
            ELSE 0 
          END),
          0
        ) as current_balance
        FROM cash_transactions
        WHERE transaction_date <= $1
      `, [new Date(payment_date)]);
      
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
          finalVoucherNo,
          remarks || `Payment to ${receiver_name}`,
          currentBalance,
          newBalance,
          new Date(payment_date)
        ]
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
      const newBalance = currentBalance - Number(amount);

      if (newBalance < 0) {
        throw new Error('Insufficient bank balance');
      }

      // Create bank transaction
      await client.query(
        `INSERT INTO bank_transactions (
          account_id, type, amount, reference, remarks, balance, balance_after, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          bank_account_id,
          'DEBIT',
          amount,
          finalVoucherNo,
          remarks || `Payment to ${receiver_name}`,
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

// Get payment history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, accountType, recordType } = req.query;
    console.log('Query parameters:', { startDate, endDate, accountType, recordType });

    let query = `
      WITH payment_data AS (
        SELECT 
          p.id::text as id,
          p.payment_date,
          TO_CHAR(p.payment_date, 'HH24:MI:SS') as payment_time,
          p.amount,
          p.payment_mode,
          p.receiver_name,
          p.remarks,
          p.voucher_no,
          CASE 
            WHEN p.payment_type = 'RECEIVED' THEN 'RV' || SUBSTRING(p.voucher_no, 3)
            WHEN p.payment_type = 'ISSUED' THEN 'PV' || SUBSTRING(p.voucher_no, 3)
            ELSE p.voucher_no
          END as receipt_no,
          p.created_by::text as created_by,
          p.processed_by_role,
          CASE
            WHEN l3.id IS NOT NULL THEN CONCAT(l1_l3.name, ' > ', l2_l3.name, ' > ', l3.name)
            WHEN l2.id IS NOT NULL THEN CONCAT(l1_l2.name, ' > ', l2.name)
            WHEN l1.id IS NOT NULL THEN l1.name
            ELSE NULL
          END as account_name,
          p.account_type,
          CASE 
            WHEN p.bank_account_id IS NOT NULL THEN b.bank_name
            ELSE NULL
          END as bank_name,
          p.payment_type
        FROM payments p
        LEFT JOIN chart_of_accounts_level3 l3 ON p.account_id = l3.id
        LEFT JOIN chart_of_accounts_level2 l2 ON p.account_id = l2.id
        LEFT JOIN chart_of_accounts_level1 l1 ON p.account_id = l1.id
        LEFT JOIN chart_of_accounts_level1 l1_l3 ON l3.level1_id = l1_l3.id
        LEFT JOIN chart_of_accounts_level2 l2_l3 ON l3.level2_id = l2_l3.id
        LEFT JOIN chart_of_accounts_level1 l1_l2 ON l2.level1_id = l1_l2.id
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
      query += ` AND p.account_type = $${paramCount}`;
      queryParams.push(accountType);
      paramCount++;
    }

    if (recordType) {
      query += ` AND p.payment_type = $${paramCount}`;
      queryParams.push(recordType);
      paramCount++;
    }

    query += `),
      expense_data AS (
        SELECT 
          e.id::text as id,
          e.date as payment_date,
          TO_CHAR(e.date, 'HH24:MI:SS') as payment_time,
          e.amount,
          'CASH' as payment_mode,
          e.receiver_name,
          e.remarks,
          e.voucher_no,
          e.voucher_no as receipt_no,
          e.created_by::text as created_by,
          e.processed_by_role,
          CASE 
            WHEN e.account_type = 'OTHER' THEN
              CASE 
                WHEN a.level = 'LEVEL3' THEN CONCAT(l1.name, ' > ', l2.name, ' > ', a.name)
                WHEN a.level = 'LEVEL2' THEN CONCAT(l1.name, ' > ', a.name)
                WHEN a.level = 'LEVEL1' THEN a.name
                ELSE e.expense_type
              END
            ELSE e.expense_type
          END as account_name,
          e.account_type,
          NULL as bank_name,
          'EXPENSE' as payment_type
        FROM expenses e
        LEFT JOIN (
          SELECT 
            id,
            name,
            account_type,
            NULL as level1_id,
            'LEVEL1' as level
          FROM chart_of_accounts_level1
          UNION ALL
          SELECT 
            id,
            name,
            account_type,
            level1_id,
            'LEVEL2' as level
          FROM chart_of_accounts_level2
          UNION ALL
          SELECT 
            id,
            name,
            account_type,
            level1_id,
            'LEVEL3' as level
          FROM chart_of_accounts_level3
        ) a ON e.account_id = a.id
        LEFT JOIN chart_of_accounts_level1 l1 ON a.level1_id = l1.id
        LEFT JOIN chart_of_accounts_level2 l2 ON a.id = l2.id AND a.level = 'LEVEL3'
      WHERE 1=1
    `;

    if (startDate) {
      query += ` AND DATE(e.date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(e.date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    if (accountType) {
      query += ` AND e.account_type = $${paramCount}`;
      queryParams.push(accountType);
      paramCount++;
    }

    if (recordType === 'EXPENSE') {
      query += ` AND e.account_type = 'OTHER'`;
    }

    query += `),
      long_voucher_data AS (
        SELECT 
          t.id::text as id,
          t.transaction_date as payment_date,
          TO_CHAR(t.transaction_date, 'HH24:MI:SS') as payment_time,
          t.amount,
          'CASH' as payment_mode,
          NULL as receiver_name,
          t.description as remarks,
          t.reference_no as voucher_no,
          t.reference_no as receipt_no,
          NULL as created_by,
          NULL as processed_by_role,
          CASE
            WHEN l3.id IS NOT NULL THEN CONCAT(l1_l3.name, ' > ', l2_l3.name, ' > ', l3.name)
            WHEN l2.id IS NOT NULL THEN CONCAT(l1_l2.name, ' > ', l2.name)
            WHEN l1.id IS NOT NULL THEN l1.name
            ELSE NULL
          END as account_name,
          'OTHER' as account_type,
          NULL as bank_name,
          CASE 
            WHEN t.entry_type = 'CREDIT' THEN 'RECEIVED'
            WHEN t.entry_type = 'DEBIT' THEN 'ISSUED'
          END as payment_type
        FROM transactions t
        LEFT JOIN chart_of_accounts_level3 l3 ON t.account_id = l3.id
        LEFT JOIN chart_of_accounts_level2 l2 ON t.account_id = l2.id
        LEFT JOIN chart_of_accounts_level1 l1 ON t.account_id = l1.id
        LEFT JOIN chart_of_accounts_level1 l1_l3 ON l3.level1_id = l1_l3.id
        LEFT JOIN chart_of_accounts_level2 l2_l3 ON l3.level2_id = l2_l3.id
        LEFT JOIN chart_of_accounts_level1 l1_l2 ON l2.level1_id = l1_l2.id
        WHERE t.reference_no LIKE 'LV-%'
    `;

    if (startDate) {
      query += ` AND DATE(t.transaction_date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(t.transaction_date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    query += `),
    combined_data AS (
      SELECT * FROM payment_data
      UNION ALL
      SELECT * FROM expense_data
      UNION ALL
      SELECT * FROM long_voucher_data
    )
    SELECT *
    FROM combined_data
    ORDER BY payment_date DESC, id DESC`;

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