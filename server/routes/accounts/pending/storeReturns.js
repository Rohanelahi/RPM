const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Get pending store return entries
router.get('/store-returns', async (req, res) => {
  try {
    console.log('Fetching pending store returns...'); // Debug log
    
    const result = await pool.query(
      `SELECT 
        pe.id as pricing_id,
        'STORE_RETURN' as entry_type,
        sr.return_grn as return_number,
        sr.grn_number as original_grn,
        se.vendor_id as account_id,
        ABS(pe.quantity) as quantity,
        pe.status,
        sr.unit,
        si.item_name,
        v.account_name as vendor_name,
        sr.date_time as return_date,
        sr.remarks as return_reason,
        pe.price_per_unit as original_price,
        t.amount as total_amount
       FROM store_returns sr
       JOIN pricing_entries pe ON pe.reference_id = sr.id
       JOIN store_entries se ON sr.grn_number = se.grn_number
       JOIN store_items si ON se.item_id = si.id
       JOIN accounts v ON se.vendor_id = v.id
       LEFT JOIN transactions t ON t.reference_no = sr.return_grn
       WHERE pe.status = 'PENDING'
       AND pe.entry_type = 'STORE_PURCHASE'
       AND pe.quantity < 0
       AND sr.return_grn IS NOT NULL
       ORDER BY sr.date_time DESC`
    );

    console.log('Found pending returns:', result.rows); // Debug log

    // Add additional check to ensure return_grn is present
    const processedRows = result.rows.map(row => {
      if (!row.return_number) {
        console.warn('Missing return number for entry:', row);
      }
      console.log('Processing row:', row); // Add this debug log
      return row;
    });

    res.json(processedRows);
  } catch (error) {
    console.error('Error fetching pending store returns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;