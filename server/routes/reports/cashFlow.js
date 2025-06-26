const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get cash flow data
router.get('/cash-flow', async (req, res) => {
  try {
    const { startDate, endDate, transactionType, sourceType } = req.query;
    
    // Build the query to combine payments, expenses, and bank transactions
    let query = `
      WITH combined_data AS (
        -- Cash transactions
        SELECT
          transaction_date AS date,
          'CASH' AS source_type,
          type AS flow_type,
          amount,
          'CASH' AS payment_mode,
          CASE
            WHEN remarks IS NULL OR remarks = ''
            THEN reference
            ELSE reference || ' - ' || remarks
          END AS description,
          NULL AS account_name,
          NULL AS receiver_name,
          NULL AS related_account_name,
          NULL AS bank_name,
          NULL AS payment_type,
          NULL AS voucher_no,
          remarks
        FROM cash_transactions
        WHERE NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE DATE(p.payment_date) = DATE(cash_transactions.transaction_date)
            AND p.amount = cash_transactions.amount
            AND p.payment_mode = 'CASH'
            AND (
              (p.payment_type = 'RECEIVED' AND cash_transactions.type = 'CREDIT') OR
              (p.payment_type = 'ISSUED' AND cash_transactions.type = 'DEBIT')
            )
            AND (
              p.voucher_no = cash_transactions.reference
              OR (p.remarks IS NOT NULL AND cash_transactions.remarks IS NOT NULL AND p.remarks = cash_transactions.remarks)
            )
        )

        UNION ALL

        -- Bank transactions (excluding those that are already payments)
        SELECT
          transaction_date AS date,
          'BANK' AS source_type,
          type AS flow_type,
          amount,
          'ONLINE' AS payment_mode,
          CASE
            WHEN reference IS NULL OR reference = ''
            THEN 'Bank Transaction - ' || ba.bank_name || ' - ' || COALESCE(bt.reference, '')
            ELSE 'Bank Transaction - ' || ba.bank_name || ' - ' || reference
          END AS description,
          ba.bank_name AS account_name,
          bt.reference AS receiver_name,
          NULL AS related_account_name,
          ba.bank_name AS bank_name,
          NULL AS payment_type,
          NULL AS voucher_no,
          reference AS remarks
        FROM bank_transactions bt
        JOIN bank_accounts ba ON bt.account_id = ba.id
        WHERE NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE p.payment_date = bt.transaction_date
          AND p.amount = bt.amount
          AND p.bank_account_id = bt.account_id
          AND (
            (p.payment_type = 'RECEIVED' AND bt.type = 'CREDIT') OR
            (p.payment_type = 'ISSUED' AND bt.type = 'DEBIT')
          )
        )

        UNION ALL

        -- Expenses
        SELECT
          date,
          'EXPENSE' AS source_type,
          'DEBIT' AS flow_type,
          amount,
          'CASH' AS payment_mode,
          CASE
            WHEN remarks IS NULL OR remarks = ''
            THEN 'Expense paid to ' || COALESCE(receiver_name, 'Unknown') || ' (' || expense_type || ')'
            ELSE 'Expense paid to ' || COALESCE(receiver_name, 'Unknown') || ' (' || expense_type || ') - ' || remarks
          END AS description,
          NULL AS account_name,
          receiver_name,
          NULL AS related_account_name,
          NULL AS bank_name,
          NULL AS payment_type,
          NULL AS voucher_no,
          remarks
        FROM expenses

        UNION ALL

        -- Payments
        SELECT
          payment_date AS date,
          'PAYMENT' AS source_type,
          CASE WHEN payment_type = 'RECEIVED' THEN 'CREDIT' ELSE 'DEBIT' END AS flow_type,
          amount,
          payment_mode,
          CASE
            WHEN remarks IS NULL OR remarks = ''
            THEN CASE WHEN payment_type = 'RECEIVED' THEN 'Receipt' ELSE 'Payment' END || ' ' || 
                 CASE WHEN payment_mode = 'ONLINE' THEN '(ONLINE - ' || ba.bank_name || ')' ELSE '(' || payment_mode || ')' END || ' ' || 
                 CASE WHEN voucher_no IS NOT NULL THEN '[' || voucher_no || '] ' ELSE '' END ||
                 'from ' || COALESCE(a.account_name, receiver_name) || 
                 CASE WHEN receiver_name IS NOT NULL AND receiver_name != COALESCE(a.account_name, '') THEN ' (' || receiver_name || ')' ELSE '' END
            ELSE CASE WHEN payment_type = 'RECEIVED' THEN 'Receipt' ELSE 'Payment' END || ' ' || 
                 CASE WHEN payment_mode = 'ONLINE' THEN '(ONLINE - ' || ba.bank_name || ')' ELSE '(' || payment_mode || ')' END || ' ' || 
                 CASE WHEN voucher_no IS NOT NULL THEN '[' || voucher_no || '] ' ELSE '' END ||
                 'from ' || COALESCE(a.account_name, receiver_name) || 
                 CASE WHEN receiver_name IS NOT NULL AND receiver_name != COALESCE(a.account_name, '') THEN ' (' || receiver_name || ')' ELSE '' END || 
                 ' - ' || remarks
          END AS description,
          a.account_name,
          receiver_name,
          a.account_name AS related_account_name,
          ba.bank_name,
          payment_type,
          voucher_no,
          remarks
        FROM payments p
        LEFT JOIN accounts a ON p.account_id = a.id
        LEFT JOIN bank_accounts ba ON p.bank_account_id = ba.id
      )

      SELECT * FROM combined_data
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Add date filters
    if (startDate) {
      query += ` AND DATE(date) >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND DATE(date) <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    // Add transaction type filter
    if (transactionType) {
      query += ` AND flow_type = $${paramCount}`;
      queryParams.push(transactionType);
      paramCount++;
    }
    
    // Add source type filter
    if (sourceType) {
      query += ` AND source_type = $${paramCount}`;
      queryParams.push(sourceType);
      paramCount++;
    }
    
    // Order by date ascending (oldest first)
    query += ` ORDER BY date ASC`;
    
    console.log('Executing query:', query);
    console.log('Query params:', queryParams);
    
    // Execute the query
    const { rows: transactions } = await pool.query(query, queryParams);
    
    // Calculate summary
    const totalCredit = transactions
      .filter(t => t.flow_type === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const totalDebit = transactions
      .filter(t => t.flow_type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    res.json({
      transactions,
      summary: {
        totalCredit,
        totalDebit
      }
    });
  } catch (error) {
    console.error('Error fetching cash flow data:', error);
    res.status(500).json({ message: error.message || 'Error fetching cash flow data' });
  }
});

module.exports = router; 