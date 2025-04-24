const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get ledger entries
router.get('/ledger', async (req, res) => {
  try {
    const { accountId, startDate, endDate, userRole } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    // Format dates for PostgreSQL
    const formattedStartDate = new Date(startDate).toISOString();
    const formattedEndDate = new Date(endDate).toISOString();

    console.log('Query params:', { accountId, startDate: formattedStartDate, endDate: formattedEndDate }); // Debug log

    // First get the account details
    const { rows: [account] } = await pool.query(
      `SELECT 
        id,
        account_name,
        account_type,
        opening_balance,
        current_balance
       FROM accounts 
       WHERE id = $1`,
      [accountId]
    );

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Modify the transactions query to handle payment entries correctly
    const transactionQuery = `
      WITH all_transactions AS (
        -- Regular transactions
        SELECT 
          t.id,
          t.transaction_date,
          t.reference_no,
          t.description,
          t.amount,
          CASE
            WHEN t.description LIKE '%Purchase against GRN%' THEN 'CREDIT'
            WHEN t.entry_type LIKE '%PURCHASE%' THEN 'CREDIT'
            WHEN t.entry_type = 'STORE_RETURN' THEN 'DEBIT'
            WHEN t.entry_type LIKE '%SALE%' THEN 'DEBIT'
            WHEN t.description LIKE '%Sale%' THEN 'DEBIT'
            ELSE t.entry_type
          END as type,
          t.item_name,
          t.quantity,
          t.unit,
          t.price_per_unit,
          t.account_id
        FROM transactions t
        WHERE t.account_id = $1
        
        UNION ALL
        
        -- Payment transactions
        SELECT 
          p.id,
          p.payment_date as transaction_date,
          p.voucher_no as reference_no,
          CASE 
            WHEN p.payment_type = 'RECEIVED' THEN 
              CASE 
                WHEN p.payment_mode = 'ONLINE' THEN
                  'Payment received from ' || p.receiver_name || ' via ' || p.payment_mode || 
                  CASE 
                    WHEN ba.bank_name IS NOT NULL THEN ' (' || ba.bank_name || ')'
                    ELSE ''
                  END
                ELSE
                  'Payment received from ' || p.receiver_name || ' via ' || p.payment_mode
              END
            ELSE 
              CASE 
                WHEN p.payment_mode = 'ONLINE' THEN
                  'Payment issued to ' || p.receiver_name || ' via ' || p.payment_mode || 
                  CASE 
                    WHEN ba.bank_name IS NOT NULL THEN ' (' || ba.bank_name || ')'
                    ELSE ''
                  END
                ELSE
                  'Payment issued to ' || p.receiver_name || ' via ' || p.payment_mode
              END
          END as description,
          p.amount,
          CASE 
            WHEN p.payment_type = 'RECEIVED' THEN 'CREDIT'
            ELSE 'DEBIT'
          END as type,
          NULL as item_name,
          NULL as quantity,
          NULL as unit,
          NULL as price_per_unit,
          p.account_id
        FROM payments p
        LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
        WHERE p.account_id = $1
      )
      SELECT 
        t.*,
        COALESCE(ge.quantity, gr.return_quantity, se.quantity) as weight,
        COALESCE(ge.item_type, ge2.item_type) as item_type,
        COALESCE(ge.paper_type, ge2.paper_type) as paper_type,
        COALESCE(ge.unit, ge2.unit, se.unit) as gate_unit,
        COALESCE(gep.total_amount, pe.total_amount) as final_total_amount,
        COALESCE(gep.price_per_unit, pe.price_per_unit) as final_price_per_unit,
        si.item_name as store_item_name,
        se.unit as store_unit,
        se.quantity as store_quantity,
        pe.price_per_unit as store_price_per_unit,
        pe.total_amount as store_total_amount
      FROM all_transactions t
      LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
      LEFT JOIN gate_returns gr ON t.reference_no = gr.return_number
      LEFT JOIN gate_entries ge2 ON gr.original_grn_number = ge2.grn_number
      LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
      LEFT JOIN store_entries se ON t.reference_no = se.grn_number
      LEFT JOIN store_items si ON se.item_id = si.id
      LEFT JOIN pricing_entries pe ON pe.reference_id = se.id AND pe.entry_type = 'STORE_PURCHASE'
      WHERE t.transaction_date >= $2::timestamp
      AND t.transaction_date <= $3::timestamp
      ORDER BY t.transaction_date ASC, t.id ASC
    `;

    const { rows: transactions } = await pool.query(
      transactionQuery,
      [accountId, formattedStartDate, formattedEndDate]
    );

    console.log('Found transactions:', transactions.length); // Debug log

    // Structure the response
    const response = {
      account_details: {
        id: account.id,
        name: account.account_name,
        type: account.account_type,
        opening_balance: account.opening_balance || 0,
        current_balance: account.current_balance || 0
      },
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        reference: t.reference_no,
        type: t.type,
        amount: t.final_total_amount || t.store_total_amount || t.amount,
        description: t.description,
        item_name: t.store_item_name || t.item_name,
        quantity: t.store_quantity || t.quantity,
        unit: t.store_unit || t.unit,
        price_per_unit: t.store_price_per_unit || t.final_price_per_unit || t.price_per_unit,
        weight: t.weight,
        item_type: t.item_type,
        paper_type: t.paper_type,
        gate_unit: t.gate_unit,
        entry_type: t.type
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching ledger:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router; 