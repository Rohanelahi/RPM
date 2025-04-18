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
          remarks
        FROM cash_transactions

        UNION ALL

        -- Bank transactions
        SELECT
          transaction_date AS date,
          'BANK' AS source_type,
          type AS flow_type,
          amount,
          'ONLINE' AS payment_mode,
          CASE
            WHEN reference IS NULL OR reference = ''
            THEN 'Bank Transaction - ' || ba.bank_name
            ELSE 'Bank Transaction - ' || ba.bank_name || ' - ' || reference
          END AS description,
          ba.bank_name AS account_name,
          NULL AS receiver_name,
          reference AS remarks
        FROM bank_transactions bt
        JOIN bank_accounts ba ON bt.account_id = ba.id

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
          remarks
        FROM expenses
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