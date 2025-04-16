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
        -- Payments received (CREDIT) - exclude online payments which are in bank_transactions
        SELECT
          p.payment_date AS date,
          'PAYMENT' AS source_type,
          'CREDIT' AS flow_type,
          p.amount,
          p.payment_mode AS payment_mode,
          CASE 
            WHEN p.remarks IS NULL OR p.remarks = '' 
            THEN 'Payment Received from ' || a.account_name || ' (' || p.payment_mode || ')'
            ELSE 'Payment Received from ' || a.account_name || ' (' || p.payment_mode || ') - ' || p.remarks
          END AS description,
          a.account_name,
          p.receiver_name,
          p.remarks
        FROM payments p
        JOIN accounts a ON p.account_id = a.id
        WHERE p.payment_type = 'RECEIVED' AND p.payment_mode != 'ONLINE'
        
        UNION ALL
        
        -- Payments issued (DEBIT) - exclude online payments which are in bank_transactions
        SELECT
          p.payment_date AS date,
          'PAYMENT' AS source_type,
          'DEBIT' AS flow_type,
          p.amount,
          p.payment_mode AS payment_mode,
          CASE 
            WHEN p.remarks IS NULL OR p.remarks = '' 
            THEN 'Payment Issued to ' || COALESCE(p.receiver_name, '') || 
                 CASE WHEN p.receiver_name IS NOT NULL AND a.account_name IS NOT NULL THEN ' (' || a.account_name || ')' 
                      WHEN p.receiver_name IS NULL THEN a.account_name
                      ELSE ''
                 END || ' (' || p.payment_mode || ')'
            ELSE 'Payment Issued to ' || COALESCE(p.receiver_name, '') || 
                 CASE WHEN p.receiver_name IS NOT NULL AND a.account_name IS NOT NULL THEN ' (' || a.account_name || ')' 
                      WHEN p.receiver_name IS NULL THEN a.account_name
                      ELSE ''
                 END || ' (' || p.payment_mode || ') - ' || p.remarks
          END AS description,
          a.account_name,
          p.receiver_name,
          p.remarks
        FROM payments p
        JOIN accounts a ON p.account_id = a.id
        WHERE p.payment_type = 'ISSUED' AND p.payment_mode != 'ONLINE'
        
        UNION ALL
        
        -- Expenses (DEBIT)
        SELECT
          e.date,
          'EXPENSE' AS source_type,
          'DEBIT' AS flow_type,
          e.amount,
          'CASH' AS payment_mode,
          CASE 
            WHEN e.remarks IS NULL OR e.remarks = '' 
            THEN 'Expense paid to ' || COALESCE(e.receiver_name, 'Unknown') || ' (' || e.expense_type || ')'
            ELSE 'Expense paid to ' || COALESCE(e.receiver_name, 'Unknown') || ' (' || e.expense_type || ') - ' || e.remarks
          END AS description,
          NULL AS account_name,
          e.receiver_name,
          e.remarks
        FROM expenses e
        
        UNION ALL
        
        -- Online payments (CREDIT/DEBIT) - join bank_transactions with payments
        SELECT
          bt.transaction_date AS date,
          'BANK' AS source_type,
          bt.type AS flow_type,
          bt.amount,
          'ONLINE' AS payment_mode,
          CASE 
            WHEN bt.type = 'CREDIT' THEN
              CASE 
                WHEN p.account_id IS NOT NULL THEN
                  'Payment Received from ' || a.account_name || ' via ' || ba.bank_name || 
                  CASE WHEN bt.reference IS NULL OR bt.reference = '' THEN '' ELSE ' - ' || bt.reference END
                ELSE
                  'Bank Deposit to ' || ba.bank_name || 
                  CASE WHEN bt.reference IS NULL OR bt.reference = '' THEN '' ELSE ' - ' || bt.reference END
              END
            ELSE
              CASE 
                WHEN p.account_id IS NOT NULL THEN
                  'Payment Issued to ' || COALESCE(p.receiver_name, '') || 
                  CASE WHEN p.receiver_name IS NOT NULL AND a.account_name IS NOT NULL THEN ' (' || a.account_name || ')' 
                       WHEN p.receiver_name IS NULL THEN a.account_name
                       ELSE ''
                  END || ' via ' || ba.bank_name || 
                  CASE WHEN bt.reference IS NULL OR bt.reference = '' THEN '' ELSE ' - ' || bt.reference END
                ELSE
                  'Bank Withdrawal from ' || ba.bank_name || 
                  CASE WHEN bt.reference IS NULL OR bt.reference = '' THEN '' ELSE ' - ' || bt.reference END
              END
          END AS description,
          ba.bank_name AS account_name,
          p.receiver_name,
          bt.reference AS remarks
        FROM bank_transactions bt
        JOIN bank_accounts ba ON bt.account_id = ba.id
        LEFT JOIN payments p ON p.bank_account_id = bt.account_id 
          AND DATE(p.payment_date) = DATE(bt.transaction_date)
          AND p.amount = bt.amount
        LEFT JOIN accounts a ON p.account_id = a.id
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