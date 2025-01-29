const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get ledger entries
router.get('/ledger', async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.query;

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

    // Get all transactions for the period with transaction type and additional details
    const { rows: transactions } = await pool.query(
      `SELECT 
        t.id,
        t.transaction_date::timestamp,
        t.reference_no,
        t.entry_type,
        t.amount,
        t.description,
        CASE 
          WHEN t.description = 'STORE_RETURN' THEN 
            (SELECT item_name FROM store_returns WHERE return_grn = t.reference_no)
          ELSE COALESCE(t.item_name, si.item_name)
        END as item_name,
        CASE 
          WHEN t.description = 'STORE_RETURN' THEN 
            (SELECT quantity FROM store_returns WHERE return_grn = t.reference_no)
          WHEN gep.final_quantity IS NOT NULL THEN gep.final_quantity
          ELSE COALESCE(t.quantity, sr.quantity)
        END as quantity,
        CASE
          WHEN t.description = 'STORE_RETURN' THEN 
            (SELECT unit FROM store_returns WHERE return_grn = t.reference_no)
          ELSE COALESCE(t.unit, si.unit)
        END as unit,
        t.price_per_unit,
        CASE 
          WHEN t.description LIKE '%PURCHASE%' AND t.description NOT LIKE '%PURCHASE_RETURN%' THEN 'DEBIT'
          WHEN t.description LIKE '%PURCHASE_RETURN%' THEN 'CREDIT'
          WHEN t.description LIKE '%SALE_RETURN%' THEN 'DEBIT'
          ELSE t.entry_type
        END as adjusted_entry_type,
        COALESCE(ge.quantity, gr.return_quantity) as weight,
        COALESCE(ge.item_type, ge2.item_type) as item_type,
        COALESCE(ge.paper_type, ge2.paper_type) as paper_type,
        COALESCE(ge.unit, ge2.unit) as gate_unit,
        COALESCE(gep.price_per_unit, t.price_per_unit) as final_price_per_unit
       FROM transactions t
       LEFT JOIN gate_entries ge ON t.reference_no = ge.grn_number
       LEFT JOIN gate_returns gr ON t.reference_no = gr.return_number
       LEFT JOIN gate_entries ge2 ON gr.original_grn_number = ge2.grn_number
       LEFT JOIN gate_entries_pricing gep ON t.reference_no = gep.grn_number
       LEFT JOIN store_entries se ON t.reference_no = se.grn_number
       LEFT JOIN store_items si ON se.item_id = si.id
       LEFT JOIN store_returns sr ON t.reference_no = sr.return_grn
       WHERE t.account_id = $1
       AND t.transaction_date >= $2::timestamp
       AND t.transaction_date <= $3::timestamp
       ORDER BY t.transaction_date, t.id`,
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
        type: t.adjusted_entry_type,
        amount: t.amount,
        description: t.description,
        item_name: t.item_name,
        quantity: t.quantity,
        unit: t.unit,
        price_per_unit: t.final_price_per_unit,
        weight: t.weight,
        item_type: t.item_type,
        paper_type: t.paper_type,
        gate_unit: t.gate_unit,
        entry_type: t.entry_type
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