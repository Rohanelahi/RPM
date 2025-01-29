const express = require('express');
const router = express.Router();
const pool = require('../../../db');

// Get pending purchase return entries
router.get('/purchase-returns', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
        gep.id as pricing_id,
        gep.entry_type,
        gr.return_number as grn_number,
        gep.account_id,
        gr.return_quantity as quantity,
        gep.status,
        gep.original_grn_number,
        gr.return_reason,
        gr.date_time,
        gr.vehicle_type,
        gr.vehicle_number,
        gr.driver_name,
        s.account_name as supplier_name,
        ge.unit,
        ge.item_type
       FROM gate_entries_pricing gep
       JOIN gate_returns gr ON gr.return_number = gep.grn_number
       JOIN accounts s ON gep.account_id = s.id
       LEFT JOIN gate_entries ge ON gep.original_grn_number = ge.grn_number
       WHERE gep.entry_type = 'PURCHASE_RETURN'
       AND gep.status = 'PENDING'
       ORDER BY gr.date_time DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending purchase returns:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 