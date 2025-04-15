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

// Run the migration when the server starts
addReceiverNameColumn();
addVoucherNoColumn();
addProcessedByRoleColumn();

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

// Handle payment received
router.post('/received', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      date, 
      paymentMode, 
      accountType, 
      accountId, 
      amount, 
      remarks, 
      receiverName, 
      userRole,
      bankTransaction 
    } = req.body;

    // Update cash tracking based on payment mode
    if (paymentMode === 'CASH') {
      await client.query(
        'UPDATE cash_tracking SET cash_in_hand = cash_in_hand + $1, last_updated = CURRENT_TIMESTAMP',
        [amount]
      );
    } else if (paymentMode === 'ONLINE' || paymentMode === 'CHEQUE') {
      await client.query(
        'UPDATE cash_tracking SET cash_in_bank = cash_in_bank + $1, last_updated = CURRENT_TIMESTAMP',
        [amount]
      );

      // If it's an online payment, create a bank transaction
      if (paymentMode === 'ONLINE' && bankTransaction) {
        // Get current bank balance
        const balanceResult = await client.query(`
          SELECT COALESCE(
            SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
            0
          ) as current_balance
          FROM bank_transactions
          WHERE account_id = $1
        `, [bankTransaction.bankAccountId]);
        
        const currentBalance = Number(balanceResult.rows[0].current_balance);
        const newBalance = currentBalance + Number(amount);
        const transactionReference = remarks || `Payment received from ${receiverName}`;
        
        await client.query(
          `INSERT INTO bank_transactions 
           (account_id, type, amount, reference, balance, balance_after, transaction_date)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            bankTransaction.bankAccountId,
            'CREDIT',
            Number(amount),
            transactionReference,
            currentBalance,
            newBalance
          ]
        );

        // Update bank account balance
        await client.query(
          `UPDATE bank_accounts 
           SET current_balance = $1 
           WHERE id = $2`,
          [newBalance, bankTransaction.bankAccountId]
        );
      }
    }

    const voucherNo = await generateVoucherNo('RECEIVED', client);

    // Create payment record
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (
        payment_date,
        payment_mode,
        account_id,
        account_type,
        amount,
        payment_type,
        remarks,
        receiver_name,
        voucher_no,
        processed_by_role,
        bank_account_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, voucher_no`,
      [
        new Date(date),
        paymentMode,
        accountId,
        accountType,
        amount,
        'RECEIVED',
        remarks,
        receiverName,
        voucherNo,
        userRole,
        paymentMode === 'ONLINE' ? bankTransaction.bankAccountId : null
      ]
    );

    await client.query('COMMIT');
    res.json({ 
      message: 'Payment received successfully', 
      paymentId: payment.id,
      voucherNo: payment.voucher_no 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ message: error.message || 'Error processing payment' });
  } finally {
    client.release();
  }
});

// Handle payment issued
router.post('/issued', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      date, 
      paymentMode, 
      accountType, 
      accountId, 
      amount, 
      remarks, 
      receiverName, 
      userRole,
      bankTransaction 
    } = req.body;

    // Update cash tracking based on payment mode
    if (paymentMode === 'CASH') {
      // Check cash balance first
      const cashResult = await client.query('SELECT cash_in_hand FROM cash_tracking LIMIT 1');
      const currentCash = Number(cashResult.rows[0]?.cash_in_hand || 0);
      
      if (currentCash < Number(amount)) {
        throw new Error('Insufficient cash balance');
      }

      await client.query(
        'UPDATE cash_tracking SET cash_in_hand = cash_in_hand - $1, last_updated = CURRENT_TIMESTAMP',
        [amount]
      );
    } else if (paymentMode === 'ONLINE' || paymentMode === 'CHEQUE') {
      if (paymentMode === 'ONLINE' && bankTransaction) {
        // Get current bank balance
        const balanceResult = await client.query(`
          SELECT COALESCE(
            SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END),
            0
          ) as current_balance
          FROM bank_transactions
          WHERE account_id = $1
        `, [bankTransaction.bankAccountId]);

        const currentBalance = Number(balanceResult.rows[0].current_balance);
        const transactionAmount = Number(amount);

        if (currentBalance < transactionAmount) {
          throw new Error(`Insufficient bank balance. Available: ${currentBalance}, Required: ${transactionAmount}`);
        }

        const newBalance = currentBalance - transactionAmount;
        const transactionReference = remarks || `Payment issued to ${receiverName}`;

        // Create bank transaction record
        await client.query(
          `INSERT INTO bank_transactions 
           (account_id, type, amount, reference, balance, balance_after, transaction_date)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            bankTransaction.bankAccountId,
            'DEBIT',
            transactionAmount,
            transactionReference,
            currentBalance,
            newBalance
          ]
        );
      }

      // Update cash in bank tracking
      await client.query(
        'UPDATE cash_tracking SET cash_in_bank = cash_in_bank - $1, last_updated = CURRENT_TIMESTAMP',
        [amount]
      );
    }

    const voucherNo = await generateVoucherNo('ISSUED', client);

    // Create payment record
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (
        payment_date,
        payment_mode,
        account_id,
        account_type,
        amount,
        payment_type,
        remarks,
        receiver_name,
        voucher_no,
        processed_by_role,
        bank_account_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, voucher_no`,
      [
        new Date(date),
        paymentMode,
        accountId,
        accountType,
        amount,
        'ISSUED',
        remarks,
        receiverName,
        voucherNo,
        userRole,
        paymentMode === 'ONLINE' ? bankTransaction.bankAccountId : null
      ]
    );

    await client.query('COMMIT');
    res.json({ 
      message: 'Payment issued successfully', 
      paymentId: payment.id,
      voucherNo: payment.voucher_no 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ message: error.message || 'Error processing payment' });
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
        b.bank_name
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