const pool = require('./server/db');

async function testDatabase() {
  try {
    // Check for duplicate entries between cash_transactions and payments
    console.log('=== Checking for duplicate entries ===');
    
    // Check cash transactions for a specific date
    const cashResult = await pool.query(`
      SELECT 
        transaction_date,
        type,
        amount,
        reference,
        remarks
      FROM cash_transactions 
      WHERE DATE(transaction_date) = '2025-06-13'
      ORDER BY transaction_date, amount
    `);
    
    console.log('\nCash transactions on 2025-06-13:');
    cashResult.rows.forEach(row => {
      console.log(row);
    });

    // Check payments for the same date
    const paymentsResult = await pool.query(`
      SELECT 
        payment_date,
        payment_type,
        amount,
        payment_mode,
        voucher_no,
        receiver_name,
        remarks
      FROM payments 
      WHERE DATE(payment_date) = '2025-06-13'
      ORDER BY payment_date, amount
    `);
    
    console.log('\nPayments on 2025-06-13:');
    paymentsResult.rows.forEach(row => {
      console.log(row);
    });

    // Check if there are matching entries
    const matchingResult = await pool.query(`
      SELECT 
        ct.transaction_date,
        ct.type,
        ct.amount,
        ct.reference,
        p.payment_date,
        p.payment_type,
        p.payment_mode,
        p.voucher_no,
        p.receiver_name
      FROM cash_transactions ct
      JOIN payments p ON 
        ct.transaction_date = p.payment_date
        AND ct.amount = p.amount
        AND p.payment_mode = 'CASH'
        AND (
          (p.payment_type = 'RECEIVED' AND ct.type = 'CREDIT') OR
          (p.payment_type = 'ISSUED' AND ct.type = 'DEBIT')
        )
      WHERE DATE(ct.transaction_date) = '2025-06-13'
    `);
    
    console.log('\nMatching entries between cash_transactions and payments:');
    matchingResult.rows.forEach(row => {
      console.log(row);
    });

    // Test the cash flow query directly
    console.log('\n=== Testing cash flow query ===');
    const cashFlowResult = await pool.query(`
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
          WHERE p.payment_date = cash_transactions.transaction_date
          AND p.amount = cash_transactions.amount
          AND p.payment_mode = 'CASH'
          AND (
            (p.payment_type = 'RECEIVED' AND cash_transactions.type = 'CREDIT') OR
            (p.payment_type = 'ISSUED' AND cash_transactions.type = 'DEBIT')
          )
        )

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
      WHERE DATE(date) = '2025-06-13'
      ORDER BY date ASC
    `);
    
    console.log('\nCash flow query results for 2025-06-13:');
    cashFlowResult.rows.forEach(row => {
      console.log(`${row.date} | ${row.source_type} | ${row.flow_type} | ${row.amount} | ${row.description}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testDatabase(); 